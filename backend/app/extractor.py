import hashlib
import os
import re
from typing import Any, Dict, List, Set, Tuple
from loguru import logger

# Silence androguard verbose logs
logger.disable("androguard")

from androguard.core.apk import APK
from androguard.core.dex import DEX

KNOWN_TRACKER_SIGNATURES = [
    {"name": "Google AdMob", "signature": "com.google.android.gms.ads"},
    {"name": "Facebook Audience Network", "signature": "com.facebook.ads"},
    {"name": "Firebase Analytics", "signature": "com.google.firebase.analytics"},
    {"name": "Unity Ads", "signature": "com.unity3d.ads"},
    {"name": "AppLovin", "signature": "com.applovin"},
    {"name": "AppsFlyer", "signature": "com.appsflyer"},
    {"name": "Adjust", "signature": "com.adjust.sdk"},
    {"name": "Branch Metrics", "signature": "io.branch.referral"},
    {"name": "Kochava", "signature": "com.kochava"},
    {"name": "Flurry Analytics", "signature": "com.flurry.android"},
    {"name": "InMobi", "signature": "com.inmobi"},
    {"name": "Vungle", "signature": "com.vungle.warren"},
    {"name": "Mixpanel", "signature": "com.mixpanel.android"},
]

# Sensitive API signatures mapped to Android permissions for declared vs used analysis
API_PERMISSION_MAPPING = {
    "android.permission.RECORD_AUDIO": [
        "AudioRecord;->startRecording",
        "MediaRecorder;->start",
        "AudioRecord;-><init>",
    ],
    "android.permission.CAMERA": [
        "Camera;->open",
        "CameraManager;->openCamera",
        "CameraDevice;",
    ],
    "android.permission.ACCESS_FINE_LOCATION": [
        "LocationManager;->requestLocationUpdates",
        "LocationManager;->getLastKnownLocation",
        "FusedLocationProviderClient;->requestLocationUpdates",
        "FusedLocationProviderClient;->getLastLocation",
    ],
    "android.permission.ACCESS_COARSE_LOCATION": [
        "LocationManager;->requestLocationUpdates",
        "LocationManager;->getLastKnownLocation",
    ],
    "android.permission.READ_CONTACTS": [
        "ContactsContract",
        "content://contacts",
        "content://com.android.contacts",
    ],
    "android.permission.READ_SMS": [
        "content://sms",
        "Telephony$Sms;->getDefaultSmsPackage",
        "SmsManager;",
    ],
    "android.permission.SEND_SMS": [
        "SmsManager;->sendTextMessage",
        "SmsManager;->sendMultipartTextMessage",
    ],
    "android.permission.READ_PHONE_STATE": [
        "TelephonyManager;->getDeviceId",
        "TelephonyManager;->getImei",
        "TelephonyManager;->getSubscriberId",
        "TelephonyManager;->getSimSerialNumber",
    ],
    "android.permission.READ_EXTERNAL_STORAGE": [
        "Environment;->getExternalStorageDirectory",
        "Environment;->getExternalStoragePublicDirectory",
    ],
    "android.permission.WRITE_EXTERNAL_STORAGE": [
        "Environment;->getExternalStorageDirectory",
        "FileOutputStream;",
    ],
}

def calculate_sha256(file_path: str) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def extract_features(apk_path: str) -> Dict[str, Any]:
    """
    Extracts comprehensive metadata, permissions (declared and used),
    components, security flags, and tracker signatures using Androguard.
    """
    apk = APK(apk_path)
    if not apk.is_valid_APK():
        raise ValueError("The provided file does not have a valid Android package structure.")

    declared_permissions = list(apk.get_permissions() or [])

    app_name = apk.get_app_name() or ""
    pkg = apk.get_package() or "unknown.package"
    if not app_name:
        last_part = pkg.split(".")[-1]
        app_name = last_part.replace("_", " ").replace("-", " ").capitalize() if last_part else "Android App"

    version_name = apk.get_androidversion_name() or "1.0.0"
    version_code = apk.get_androidversion_code() or "1"

    try:
        min_sdk = int(apk.get_min_sdk_version() or 21)
    except (ValueError, TypeError):
        min_sdk = 21

    try:
        target_sdk = int(apk.get_target_sdk_version() or 33)
    except (ValueError, TypeError):
        target_sdk = 33

    activities = list(apk.get_activities() or [])
    services = list(apk.get_services() or [])
    receivers = list(apk.get_receivers() or [])
    providers = list(apk.get_providers() or [])

    # Manifest security attributes
    exported_count = 0
    unprotected_exported_count = 0
    debuggable = False
    cleartext_traffic = False
    allow_backup = True

    manifest_xml = apk.get_android_manifest_xml()
    if manifest_xml is not None:
        ns = "http://schemas.android.com/apk/res/android"
        app_elem = manifest_xml.find("application")
        if app_elem is not None:
            deb_attr = app_elem.get(f"{{{ns}}}debuggable")
            if deb_attr in ("true", "1", True):
                debuggable = True

            cleartext_attr = app_elem.get(f"{{{ns}}}usesCleartextTraffic")
            if cleartext_attr in ("true", "1", True):
                cleartext_traffic = True

            backup_attr = app_elem.get(f"{{{ns}}}allowBackup")
            if backup_attr in ("false", "0", False):
                allow_backup = False

            for tag in ("activity", "activity-alias", "service", "receiver", "provider"):
                for elem in app_elem.findall(tag):
                    is_exported = elem.get(f"{{{ns}}}exported")
                    intent_filters = elem.findall("intent-filter")
                    has_intent_filter = len(intent_filters) > 0
                    perm = elem.get(f"{{{ns}}}permission")

                    if is_exported == "true" or (is_exported is None and has_intent_filter):
                        exported_count += 1
                        if has_intent_filter and not perm:
                            unprotected_exported_count += 1

    # DEX Bytecode Analysis: classes, method calls, strings, trackers
    dex_classes: Set[str] = set()
    dex_strings: Set[str] = set()
    used_permissions: Set[str] = set()
    detected_trackers: List[Dict[str, Any]] = []

    try:
        for dex_bytes in apk.get_all_dex():
            try:
                dex = DEX(dex_bytes)
                for cname in dex.get_classes_names():
                    clean_name = cname.lstrip("L").rstrip(";").replace("/", ".")
                    dex_classes.add(clean_name)

                # Check string references / methods in DEX
                for s in dex.get_strings():
                    if isinstance(s, bytes):
                        s = s.decode("utf-8", errors="ignore")
                    dex_strings.add(s)
            except Exception:
                pass
    except Exception:
        pass

    # Check tracker signatures against DEX classes and strings
    all_classes_str = " ".join(dex_classes)
    for tracker in KNOWN_TRACKER_SIGNATURES:
        if tracker["signature"] in all_classes_str:
            detected_trackers.append({
                "name": tracker["name"],
                "signature": tracker["signature"],
                "evidence": "Observed"
            })

    # Determine used permissions by analyzing DEX calls/strings
    for perm, api_patterns in API_PERMISSION_MAPPING.items():
        if perm in declared_permissions:
            for pattern in api_patterns:
                if any(pattern in s for s in dex_strings) or any(pattern.replace(";->", ".").replace(";", "") in c for c in dex_classes):
                    used_permissions.add(perm)
                    break
        else:
            # Check if used without being declared
            for pattern in api_patterns:
                if any(pattern in s for s in dex_strings):
                    used_permissions.add(perm)
                    break

    sha256_hash = calculate_sha256(apk_path)
    file_size_bytes = os.path.getsize(apk_path)

    return {
        "app_name": app_name,
        "package_name": pkg,
        "version_name": version_name,
        "version_code": version_code,
        "min_sdk": min_sdk,
        "target_sdk": target_sdk,
        "apk_sha256": sha256_hash,
        "file_size_bytes": file_size_bytes,
        "permissions": declared_permissions,
        "declared_permissions": declared_permissions,
        "used_permissions": list(used_permissions),
        "activities": activities,
        "services": services,
        "receivers": receivers,
        "providers": providers,
        "exported_components": exported_count,
        "dangerous_exported_components": unprotected_exported_count,
        "debuggable": debuggable,
        "cleartext_traffic": cleartext_traffic,
        "allow_backup": allow_backup,
        "trackers": detected_trackers,
        "dex_classes_count": len(dex_classes),
    }
