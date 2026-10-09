import math
from typing import Any, Dict, List, Tuple

# Permission-statistics model (hand-weighted, RiskInDroid-style). NOTE: these are fixed weights,
# not a trained scikit-learn model. Describe it as a 'permission risk model' unless you plug in
# the real RiskInDroid classifier.
# Only recognised Android permissions carry weight; custom/vendor permissions count as 0.
RISKINDROID_WEIGHTS: Dict[str, float] = {
    # Critical hardware & privacy sensors
    "android.permission.RECORD_AUDIO": 28.5,
    "android.permission.CAMERA": 24.0,
    "android.permission.ACCESS_FINE_LOCATION": 22.0,
    "android.permission.ACCESS_COARSE_LOCATION": 14.5,
    "android.permission.ACCESS_BACKGROUND_LOCATION": 35.0,
    
    # Personal Identity & Telephony
    "android.permission.READ_PHONE_STATE": 25.0,
    "android.permission.READ_CALL_LOG": 32.0,
    "android.permission.WRITE_CALL_LOG": 34.0,
    "android.permission.CALL_PHONE": 22.5,
    "android.permission.READ_CONTACTS": 26.0,
    "android.permission.WRITE_CONTACTS": 28.0,
    "android.permission.GET_ACCOUNTS": 16.0,
    
    # Messaging & SMS
    "android.permission.SEND_SMS": 38.0,
    "android.permission.READ_SMS": 36.0,
    "android.permission.RECEIVE_SMS": 35.0,
    "android.permission.RECEIVE_MMS": 28.0,
    "android.permission.RECEIVE_WAP_PUSH": 30.0,
    
    # File Storage & System
    "android.permission.READ_EXTERNAL_STORAGE": 18.0,
    "android.permission.WRITE_EXTERNAL_STORAGE": 20.0,
    "android.permission.MANAGE_EXTERNAL_STORAGE": 32.0,
    "android.permission.REQUEST_INSTALL_PACKAGES": 36.0,
    "android.permission.SYSTEM_ALERT_WINDOW": 26.0,
    "android.permission.RECEIVE_BOOT_COMPLETED": 12.0,
    "android.permission.INTERNET": 6.0,
    "android.permission.ACCESS_NETWORK_STATE": 2.0,
    "android.permission.ACCESS_WIFI_STATE": 4.0,
    "android.permission.CHANGE_WIFI_STATE": 10.0,
    "android.permission.BLUETOOTH": 8.0,
    "android.permission.BLUETOOTH_ADMIN": 14.0,
    "android.permission.BLUETOOTH_SCAN": 18.0,
    "android.permission.BLUETOOTH_CONNECT": 12.0,
    "android.permission.BODY_SENSORS": 24.0,
    "android.permission.ACTIVITY_RECOGNITION": 14.0,
    "android.permission.POST_NOTIFICATIONS": 4.0,
    "android.permission.WAKE_LOCK": 6.0,
    "android.permission.VIBRATE": 1.0,
}

# Unknown / custom / vendor permissions (com.google.*, com.android.vending.*, app-specific) = 0.
# The old default of 8 per unknown permission pushed every real app to 100.
DEFAULT_PERMISSION_WEIGHT = 0.0

# Each extra permission adds less than the one before it, and the total saturates smoothly.
DECAY = 0.88     # k-th highest permission counts DECAY**k
SCALE = 150.0    # raw points that give ~63 risk; tune on real APKs


def calculate_ml_risk(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Permission-only risk (0-100, higher = riskier). This is the "what could this app do"
    signal. It does NOT know what the app is for, so smart_brain.py carries the
    purpose-vs-permission judgement and should have the biggest weight in combine.py.
    """
    declared = set(features.get("declared_permissions") or features.get("permissions") or [])
    used_raw = features.get("used_permissions")
    used = set(used_raw or [])

    scored = []
    unrecognised = 0
    for perm in declared:
        base = RISKINDROID_WEIGHTS.get(perm, DEFAULT_PERMISSION_WEIGHT)
        if base <= 0:
            unrecognised += 1
            continue
        is_used = perm in used
        w = base * (1.25 if is_used else 1.0)
        scored.append((w, perm, is_used))

    if not scored:
        return {
            "ml_risk": 0.0,
            "feature_contributions": [],
            "top_factors": ["No sensitive Android permissions declared."],
            "confidence": 90.0,
        }

    scored.sort(reverse=True)
    raw = sum(w * (DECAY ** i) for i, (w, _, _) in enumerate(scored))
    risk_val = 100.0 * (1.0 - math.exp(-raw / SCALE))
    risk_val = max(0.0, min(100.0, risk_val))

    contributions = []
    for w, perm, is_used in scored:
        contributions.append({
            "feature": perm,
            "name": perm.split(".")[-1],
            "weight": round(w, 1),
            "used": is_used,
            "status": "Declared & Bytecode Active" if is_used else "Declared in Manifest",
        })

    top_factors = [
        f"Permission model: {c['name']} ({c['status']}) adds {c['weight']} risk units."
        for c in contributions[:4]
    ]

    return {
        "ml_risk": round(risk_val, 2),
        "raw_score": round(raw, 2),
        "feature_contributions": contributions,
        "top_factors": top_factors,
        "unrecognised_permissions": unrecognised,
        "confidence": 80.0 if used_raw is not None else 65.0,
    }
