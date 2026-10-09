import hashlib
import os
from typing import Any, Optional
from loguru import logger

# Silence androguard verbose logs
logger.disable("androguard")

from androguard.core.apk import APK
from androguard.core.dex import DEX

def calculate_sha256(file_path: str) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def parse_apk(path: str) -> dict[str, Any]:
    apk = APK(path)
    if not apk.is_valid_APK():
        raise ValueError("The provided file does not have a valid Android package structure.")

    # Permissions
    permissions = list(apk.get_permissions() or [])

    # Basic app metadata
    app_name = apk.get_app_name() or ""
    pkg = apk.get_package() or "unknown.package"
    if not app_name:
        last_part = pkg.split(".")[-1]
        app_name = last_part.replace("_", " ").replace("-", " ").capitalize() if last_part else "Android App"

    version_name = apk.get_androidversion_name() or "1.0.0"

    min_sdk_val = apk.get_min_sdk_version()
    try:
        min_sdk = int(min_sdk_val) if min_sdk_val is not None else 21
    except (ValueError, TypeError):
        min_sdk = 21

    target_sdk_val = apk.get_target_sdk_version()
    try:
        target_sdk = int(target_sdk_val) if target_sdk_val is not None else 33
    except (ValueError, TypeError):
        target_sdk = 33

    activities = list(apk.get_activities() or [])
    services = list(apk.get_services() or [])
    receivers = list(apk.get_receivers() or [])
    providers = list(apk.get_providers() or [])

    # Security metadata from manifest
    exported_count = 0
    unprotected_exported_count = 0
    debuggable = False
    cleartext_traffic = False

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

    # DEX class names scan for trackers and referencing classes
    dex_classes: set[str] = set()
    try:
        for dex_bytes in apk.get_all_dex():
            try:
                dex = DEX(dex_bytes)
                for cname in dex.get_classes_names():
                    clean_name = cname.lstrip("L").rstrip(";").replace("/", ".")
                    dex_classes.add(clean_name)
            except Exception:
                pass
    except Exception:
        pass

    sha256_hash = calculate_sha256(path)

    return {
        "app_name": app_name,
        "package_name": pkg,
        "version_name": version_name,
        "min_sdk": min_sdk,
        "target_sdk": target_sdk,
        "apk_sha256": sha256_hash,
        "permissions": permissions,
        "activities": activities,
        "services": services,
        "receivers": receivers,
        "providers": providers,
        "exported_components": exported_count,
        "dangerous_exported_components": unprotected_exported_count,
        "debuggable": debuggable,
        "cleartext_traffic": cleartext_traffic,
        "dex_classes": list(dex_classes),
    }
