"""
features_extractor.py - turns an APK into the `features` dict the smart brain needs.

BEST EFFORT, NOT TESTED against your Androguard version (the sandbox had no Androguard).
Androguard's API differs between 3.x and 4.x, so every risky step is wrapped:
if a step fails, that key is left out/None and the brain treats it as "not verified"
(lower confidence) instead of crashing. Run it on 2-3 real APKs and print the result.

    features = extract_features("app.apk", category="COMMUNICATION")   # category optional
    brain    = smart_brain.analyze(features)
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set

from loguru import logger

# group -> [(class regex, method regex)] : sensitive API calls found in the bytecode
SENSITIVE_APIS = {
    "camera": [(r"Landroid/hardware/Camera;", r"open"),
               (r"Landroid/hardware/camera2/CameraManager;", r"openCamera"),
               (r"Landroidx/camera/", r".*")],
    "microphone": [(r"Landroid/media/AudioRecord;", r"startRecording|read"),
                   (r"Landroid/media/MediaRecorder;", r"start|setAudioSource")],
    "location": [(r"Landroid/location/LocationManager;", r"requestLocationUpdates|getLastKnownLocation"),
                 (r"Lcom/google/android/gms/location/", r"requestLocationUpdates|getLastLocation")],
    "sms": [(r"Landroid/telephony/SmsManager;", r".*"),
            (r"Landroid/provider/Telephony\$Sms", r".*")],
    "contacts": [(r"Landroid/provider/ContactsContract", r".*")],
    "call_log": [(r"Landroid/provider/CallLog", r".*")],
    "phone_state": [(r"Landroid/telephony/TelephonyManager;",
                     r"getDeviceId|getImei|getSubscriberId|getLine1Number|getSimSerialNumber")],
    "app_inventory": [(r"Landroid/content/pm/PackageManager;", r"getInstalledPackages|getInstalledApplications")],
    "calendar": [(r"Landroid/provider/CalendarContract", r".*")],
    "accessibility": [(r"Landroid/accessibilityservice/AccessibilityService;", r".*")],
}
# group -> permission groups it proves (location API also covers background location)
GROUP_TO_PERMS = {
    "camera": ["CAMERA"], "microphone": ["RECORD_AUDIO"],
    "location": ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "ACCESS_BACKGROUND_LOCATION"],
    "sms": ["READ_SMS", "RECEIVE_SMS", "SEND_SMS"], "contacts": ["READ_CONTACTS", "WRITE_CONTACTS"],
    "call_log": ["READ_CALL_LOG", "WRITE_CALL_LOG"], "phone_state": ["READ_PHONE_STATE", "READ_PHONE_NUMBERS"],
    "app_inventory": ["QUERY_ALL_PACKAGES"], "calendar": ["READ_CALENDAR", "WRITE_CALENDAR"],
}


def _dotted(cls_name: str) -> str:
    return cls_name.strip("L;").replace("/", ".")


def extract_features(apk_path: str, category: Optional[str] = None) -> Dict[str, Any]:
    from androguard.misc import AnalyzeAPK  # imported here so the rest of the app runs without it

    a, _d, dx = AnalyzeAPK(apk_path)
    f: Dict[str, Any] = {"category": category}

    def safe(fn, default=None):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001
            logger.debug(f"extractor step failed: {e}")
            return default

    f["package"] = safe(a.get_package, "")
    f["app_label"] = safe(a.get_app_name, "")
    f["declared_permissions"] = sorted(set(safe(a.get_permissions, []) or []))
    f["activities"] = safe(a.get_activities, []) or []
    services = safe(a.get_services, []) or []
    receivers = safe(a.get_receivers, []) or []
    f["services"], f["receivers"] = services, receivers
    f["has_launcher_activity"] = bool(safe(a.get_main_activities, []))
    f["target_sdk"] = safe(lambda: int(a.get_target_sdk_version()))
    f["debuggable"] = safe(lambda: a.get_attribute_value("application", "debuggable") == "true", False)
    f["cleartext_traffic"] = safe(lambda: a.get_attribute_value("application", "usesCleartextTraffic") == "true", False)

    # libraries the APK ships with (for SDK hints + ad/tracker detection)
    libs: Set[str] = set()
    for c in safe(lambda: list(dx.get_classes()), []) or []:
        name = _dotted(getattr(c, "name", ""))
        if "." in name:
            libs.add(name)
    f["libraries"] = sorted(libs)

    # which sensitive APIs are really called, and from where (service/receiver = background)
    bg_classes = {_dotted(x) for x in list(services) + list(receivers)}
    used_groups: Set[str] = set()
    bg_groups: Set[str] = set()
    api_scan_ok = False
    for group, rules in SENSITIVE_APIS.items():
        for cls_rx, m_rx in rules:
            methods = safe(lambda: list(dx.find_methods(classname=cls_rx, methodname=m_rx)), None)
            if methods is None:
                continue
            api_scan_ok = True
            for m in methods:
                callers = safe(lambda: [_dotted(c.name) for c, _meth, _off in m.get_xref_from()], []) or []
                if callers:
                    used_groups.add(group)
                if any(c in bg_classes or c.rsplit("$", 1)[0] in bg_classes for c in callers):
                    bg_groups.add(group)

    if api_scan_ok:
        f["used_api_groups"] = sorted(used_groups)
        f["background_sensitive_groups"] = sorted(bg_groups)
        declared = set(f["declared_permissions"])
        f["used_permissions"] = sorted(
            "android.permission." + p for g in used_groups for p in GROUP_TO_PERMS.get(g, [])
            if "android.permission." + p in declared
        )
    else:
        # Could not analyze bytecode: leave keys out so the brain reports "Not verified"
        logger.warning("Bytecode API scan unavailable; usage evidence will be 'Not verified'")
    return f
