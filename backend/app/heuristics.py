from typing import Any, Dict, List, Set
from .config import AUTO_DETECT_KEYWORDS

CATEGORY_EXPECTED_PERMISSIONS: Dict[str, Set[str]] = {
    "Notes": {"android.permission.INTERNET", "android.permission.POST_NOTIFICATIONS"},
    "Calculator": set(),
    "Clock": {"android.permission.POST_NOTIFICATIONS", "android.permission.WAKE_LOCK", "android.permission.VIBRATE"},
    "Camera & Photography": {"android.permission.CAMERA", "android.permission.READ_MEDIA_IMAGES", "android.permission.READ_EXTERNAL_STORAGE", "android.permission.WRITE_EXTERNAL_STORAGE"},
    "Navigation & Maps": {"android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_BACKGROUND_LOCATION", "android.permission.INTERNET"},
    "Messaging": {"android.permission.INTERNET", "android.permission.POST_NOTIFICATIONS", "android.permission.READ_CONTACTS", "android.permission.CAMERA", "android.permission.RECORD_AUDIO"},
    "Social": {"android.permission.INTERNET", "android.permission.POST_NOTIFICATIONS", "android.permission.CAMERA", "android.permission.READ_MEDIA_IMAGES"},
    "Finance & Banking": {"android.permission.INTERNET", "android.permission.POST_NOTIFICATIONS", "android.permission.USE_BIOMETRIC", "android.permission.USE_FINGERPRINT"},
    "Health & Fitness": {"android.permission.INTERNET", "android.permission.BODY_SENSORS", "android.permission.ACTIVITY_RECOGNITION", "android.permission.ACCESS_FINE_LOCATION"},
}

def calculate_heuristic_risk(
    features: Dict[str, Any],
    claim: str = "",
    category: str = "Utilities & Tools"
) -> Dict[str, Any]:
    """
    Computes heuristic policy and permission divergence risk (0-100, higher = riskier).
    Evaluates:
      - Dangerous permission combinations (Mic + Cam, Location + Background)
      - Security posture: debuggable, cleartext traffic, unprotected exported components
      - Claim-to-permission expectation mismatch
    """
    declared = set(features.get("declared_permissions") or features.get("permissions") or [])
    used = set(features.get("used_permissions") or [])
    violations: List[Dict[str, Any]] = []
    points = 0.0

    # 1. Hardware Sensor Overexposure
    if "android.permission.RECORD_AUDIO" in declared and "android.permission.CAMERA" in declared:
        pts = 24.0
        points += pts
        violations.append({
            "rule": "SURVEILLANCE_SURFACE_DUAL_SENSOR",
            "title": "Simultaneous Microphone and Camera Access Declared",
            "severity": "high",
            "impact": pts,
            "explanation": "Application requests concurrent access to both audio recording and camera hardware."
        })
    elif "android.permission.RECORD_AUDIO" in declared:
        pts = 15.0
        points += pts
        violations.append({
            "rule": "MICROPHONE_DECLARED",
            "title": "Microphone Audio Recording Access",
            "severity": "medium",
            "impact": pts,
            "explanation": "Application declares ability to capture ambient audio streams."
        })
    elif "android.permission.CAMERA" in declared:
        pts = 12.0
        points += pts
        violations.append({
            "rule": "CAMERA_DECLARED",
            "title": "Camera Hardware Capture Access",
            "severity": "medium",
            "impact": pts,
            "explanation": "Application declares direct camera sensor access."
        })

    # 2. Location Tracking Surface
    if "android.permission.ACCESS_FINE_LOCATION" in declared:
        if "android.permission.ACCESS_BACKGROUND_LOCATION" in declared:
            pts = 28.0
            points += pts
            violations.append({
                "rule": "CONTINUOUS_BACKGROUND_GEOLOCATION",
                "title": "Continuous Background GPS Location Access",
                "severity": "critical",
                "impact": pts,
                "explanation": "App can track physical coordinates even when minimized or closed."
            })
        else:
            pts = 16.0
            points += pts
            violations.append({
                "rule": "PRECISE_GPS_LOCATION",
                "title": "Precise GPS Satellite Coordinates Requested",
                "severity": "medium",
                "impact": pts,
                "explanation": "App declares precise location accuracy down to a few meters."
            })

    # 3. Telephony and Identity
    if any(p in declared for p in ("android.permission.READ_SMS", "android.permission.SEND_SMS", "android.permission.RECEIVE_SMS")):
        pts = 25.0
        points += pts
        violations.append({
            "rule": "CELLULAR_SMS_ACCESS",
            "title": "Telephony SMS Message Interception Surface",
            "severity": "high",
            "impact": pts,
            "explanation": "Application requests access to personal text messages and two-factor authentication codes."
        })

    if "android.permission.READ_CONTACTS" in declared:
        pts = 16.0
        points += pts
        violations.append({
            "rule": "ADDRESS_BOOK_HARVEST",
            "title": "Personal Address Book & Contacts Access",
            "severity": "medium",
            "impact": pts,
            "explanation": "App requests full read access to user contact records."
        })

    # 4. Manifest Security Configuration Flags
    if features.get("debuggable", False):
        pts = 20.0
        points += pts
        violations.append({
            "rule": "MANIFEST_DEBUGGABLE_ENABLED",
            "title": "Application Compiled With Debuggable Flag",
            "severity": "high",
            "impact": pts,
            "explanation": "Debuggable builds expose memory and internal process state via Android Debug Bridge (ADB)."
        })

    if features.get("cleartext_traffic", False):
        pts = 14.0
        points += pts
        violations.append({
            "rule": "INSECURE_CLEARTEXT_TRAFFIC",
            "title": "Unencrypted HTTP Cleartext Traffic Permitted",
            "severity": "medium",
            "impact": pts,
            "explanation": "Permits unencrypted network transmissions susceptible to network eavesdropping."
        })

    dangerous_exported = features.get("dangerous_exported_components", 0)
    if dangerous_exported > 0:
        pts = min(22.0, 10.0 + dangerous_exported * 4.0)
        points += pts
        violations.append({
            "rule": "UNPROTECTED_EXPORTED_COMPONENTS",
            "title": f"{dangerous_exported} Exported Component(s) Without Permission Restrictions",
            "severity": "high",
            "impact": pts,
            "explanation": "Activities or services are exposed to other third-party apps on the device without access control."
        })

    target_sdk = features.get("target_sdk", 34)
    if target_sdk < 28:
        pts = 18.0
        points += pts
        violations.append({
            "rule": "LEGACY_TARGET_SDK",
            "title": f"Legacy Target SDK {target_sdk}",
            "severity": "high",
            "impact": pts,
            "explanation": "Targets pre-Android 9 runtime, bypassing modern permission sandbox enhancements."
        })
    elif target_sdk < 31:
        pts = 10.0
        points += pts
        violations.append({
            "rule": "OUTDATED_TARGET_SDK",
            "title": f"Target SDK {target_sdk} (Below Android 12)",
            "severity": "low",
            "impact": pts,
            "explanation": "Does not enforce modern approximate location and microphone indicator guardrails."
        })

    # 5. Category Claim Mismatch
    expected = CATEGORY_EXPECTED_PERMISSIONS.get(category, set())
    unexpected_sensitive = declared - expected
    high_impact_unexpected = [
        p for p in unexpected_sensitive
        if any(k in p for k in ("LOCATION", "CAMERA", "AUDIO", "SMS", "CONTACTS", "CALL_LOG"))
    ]
    if high_impact_unexpected:
        pts = min(25.0, len(high_impact_unexpected) * 10.0)
        points += pts
        violations.append({
            "rule": "CATEGORY_CLAIM_DIVERGENCE",
            "title": f"Unjustified Sensitive Permissions For '{category}' App",
            "severity": "high",
            "impact": pts,
            "explanation": f"Declared permissions ({', '.join(p.split('.')[-1] for p in high_impact_unexpected[:3])}) are unusual for standard {category} apps."
        })

    final_score = min(100.0, max(0.0, points))
    
    # Top explainable factors
    top_factors = [v["title"] + ": " + v["explanation"] for v in violations[:4]]

    return {
        "heuristic_risk": round(final_score, 2),
        "violations": violations,
        "top_factors": top_factors,
        "points_accumulated": round(points, 2),
    }
