"""
smart_brain.py - the "does this app NEED these permissions?" engine.

It does not score a permission list. It first works out what the app is FOR
(category, SDKs, API usage), then checks every sensitive permission against that
purpose, and then looks for harmful patterns (permission combos + background use).

Input  : `features` dict from features_extractor.extract_features() (every key optional)
Output : dict with heuristic_risk (0-100, higher = riskier) + explanation fields.
         Drop-in replacement for the old heuristic result in combine.combine_scores().

Score logic:
  points per permission = harm_potential x expectation x evidence x context
      harm_potential : how dangerous the permission is (0-40)
      expectation    : core 0.10 / common 0.30 / uncommon 0.70 / unexpected 1.00
                       (from the app's category + libraries it ships with)
      evidence       : seen in code 1.0 / not verified 0.8 / declared but unused 0.55
      context        : x1.35 if used from a background service/receiver,
                       x1.15 if the app also ships ad/tracker SDKs and has internet
  + points for harmful combinations (e.g. SMS + internet in a flashlight app)
  heuristic_risk = 100 * (1 - exp(-total_points / K))   -> never saturates by count alone
"""
from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Optional, Set, Tuple

P = "android.permission."
K = 70.0  # saturation scale; higher = harsher curve is flatter. Tune on real APKs.

LEVEL = {"core": 0.10, "common": 0.30, "unknown": 0.45, "uncommon": 0.70, "unexpected": 1.00}
ODD = 0.45  # at or above this a permission is not justified by the app's purpose
LEVEL_LABEL = {"core": "Expected", "common": "Common", "unknown": "Unverified", "uncommon": "Unusual", "unexpected": "Unexpected"}

# permission -> (group, harm potential 0-40)
PERMISSION_MAP: Dict[str, Tuple[str, float]] = {
    P + "ACCESS_FINE_LOCATION": ("location", 22),
    P + "ACCESS_COARSE_LOCATION": ("location", 14),
    P + "ACCESS_BACKGROUND_LOCATION": ("location_background", 35),
    P + "CAMERA": ("camera", 24),
    P + "RECORD_AUDIO": ("microphone", 28),
    P + "READ_CONTACTS": ("contacts", 26),
    P + "WRITE_CONTACTS": ("contacts", 24),
    P + "GET_ACCOUNTS": ("accounts", 14),
    P + "READ_SMS": ("sms", 36),
    P + "RECEIVE_SMS": ("sms", 35),
    P + "SEND_SMS": ("sms", 38),
    P + "RECEIVE_MMS": ("sms", 26),
    P + "RECEIVE_WAP_PUSH": ("sms", 28),
    P + "READ_CALL_LOG": ("call_log", 32),
    P + "WRITE_CALL_LOG": ("call_log", 32),
    P + "PROCESS_OUTGOING_CALLS": ("call_log", 30),
    P + "CALL_PHONE": ("calls", 20),
    P + "ANSWER_PHONE_CALLS": ("calls", 20),
    P + "READ_PHONE_STATE": ("phone_state", 20),
    P + "READ_PHONE_NUMBERS": ("phone_state", 22),
    P + "READ_EXTERNAL_STORAGE": ("storage", 14),
    P + "WRITE_EXTERNAL_STORAGE": ("storage", 16),
    P + "MANAGE_EXTERNAL_STORAGE": ("storage_all", 32),
    P + "READ_MEDIA_IMAGES": ("media", 14),
    P + "READ_MEDIA_VIDEO": ("media", 14),
    P + "READ_MEDIA_AUDIO": ("media", 12),
    P + "READ_CALENDAR": ("calendar", 16),
    P + "WRITE_CALENDAR": ("calendar", 16),
    P + "BODY_SENSORS": ("body_sensors", 22),
    P + "ACTIVITY_RECOGNITION": ("activity", 14),
    P + "BLUETOOTH_SCAN": ("nearby", 14),
    P + "BLUETOOTH_CONNECT": ("nearby", 8),
    P + "NEARBY_WIFI_DEVICES": ("nearby", 10),
    P + "REQUEST_INSTALL_PACKAGES": ("install_packages", 36),
    P + "SYSTEM_ALERT_WINDOW": ("overlay", 26),
    P + "BIND_ACCESSIBILITY_SERVICE": ("accessibility", 38),
    P + "BIND_DEVICE_ADMIN": ("device_admin", 38),
    P + "QUERY_ALL_PACKAGES": ("app_inventory", 18),
    P + "PACKAGE_USAGE_STATS": ("usage_stats", 24),
    P + "RECEIVE_BOOT_COMPLETED": ("autostart", 8),
}

GROUP_SENS: Dict[str, float] = {}
for _perm, (_g, _s) in PERMISSION_MAP.items():
    GROUP_SENS[_g] = max(GROUP_SENS.get(_g, 0), _s)

GROUP_NAME = {
    "location": "location", "location_background": "background location", "camera": "camera",
    "microphone": "microphone", "contacts": "contacts", "accounts": "account list", "sms": "SMS",
    "call_log": "call log", "calls": "phone calls", "phone_state": "phone identity/state",
    "storage": "file storage", "storage_all": "full storage access", "media": "photos/media",
    "calendar": "calendar", "body_sensors": "body sensors", "activity": "activity recognition",
    "nearby": "nearby devices", "install_packages": "installing other apps", "overlay": "screen overlay",
    "accessibility": "accessibility control", "device_admin": "device admin", "app_inventory": "list of installed apps",
    "usage_stats": "app usage history", "autostart": "auto-start at boot",
}

# Groups whose data can leave the phone and hurt the user if misused.
DATA_GROUPS = {"location", "location_background", "camera", "microphone", "contacts", "accounts", "sms",
               "call_log", "phone_state", "media", "calendar", "app_inventory", "usage_stats", "body_sensors"}

# category -> {group: expectation}. Groups not listed: unexpected if harm >= 24 else uncommon.
CATEGORY_PROFILES: Dict[str, Dict[str, str]] = {
    "COMMUNICATION": {"microphone": "core", "camera": "core", "contacts": "core", "calls": "core", "media": "core",
                      "storage": "core", "sms": "common", "call_log": "common", "phone_state": "common",
                      "nearby": "common", "autostart": "common", "accounts": "common"},
    "SOCIAL": {"camera": "core", "microphone": "core", "contacts": "core", "media": "core", "storage": "core",
               "location": "common", "accounts": "common", "nearby": "common", "autostart": "common"},
    "DATING": {"camera": "core", "location": "core", "media": "core", "storage": "core", "microphone": "common"},
    "MAPS_AND_NAVIGATION": {"location": "core", "location_background": "core", "activity": "common",
                            "storage": "common", "nearby": "common", "microphone": "common", "autostart": "common"},
    "TRAVEL_AND_LOCAL": {"location": "core", "camera": "common", "storage": "common", "media": "common",
                         "calendar": "common"},
    "PHOTOGRAPHY": {"camera": "core", "media": "core", "storage": "core", "microphone": "core", "location": "common"},
    "VIDEO_PLAYERS": {"media": "core", "storage": "core", "nearby": "common"},
    "MUSIC_AND_AUDIO": {"media": "core", "storage": "core", "microphone": "common", "nearby": "common",
                        "phone_state": "common", "autostart": "common"},
    "ENTERTAINMENT": {"media": "common", "storage": "common", "nearby": "common"},
    "GAME": {"storage": "common", "media": "common"},
    "TOOLS": {"storage": "common", "media": "common", "storage_all": "common", "camera": "common",
              "nearby": "common", "autostart": "common", "usage_stats": "common", "app_inventory": "common",
              "overlay": "common"},
    "FLASHLIGHT": {"camera": "core"},
    "CALCULATOR": {},
    "PRODUCTIVITY": {"storage": "core", "calendar": "core", "accounts": "core", "media": "common",
                     "contacts": "common", "camera": "common", "microphone": "common", "autostart": "common"},
    "BUSINESS": {"storage": "core", "calendar": "core", "accounts": "core", "contacts": "common", "calls": "common",
                 "camera": "common", "microphone": "common", "media": "common", "autostart": "common"},
    "FINANCE": {"camera": "core", "sms": "common", "phone_state": "common", "location": "common",
                "storage": "common", "media": "common"},
    "SHOPPING": {"camera": "common", "location": "common", "storage": "common", "media": "common"},
    "FOOD_AND_DRINK": {"location": "core", "camera": "common", "calls": "common", "storage": "common"},
    "HEALTH_AND_FITNESS": {"activity": "core", "body_sensors": "core", "location": "core",
                           "location_background": "common", "camera": "common", "nearby": "common",
                           "calendar": "common", "storage": "common"},
    "EDUCATION": {"camera": "common", "microphone": "common", "storage": "common", "media": "common"},
    "NEWS_AND_MAGAZINES": {"location": "common", "storage": "common"},
    "WEATHER": {"location": "core", "location_background": "common"},
    "BOOKS_AND_REFERENCE": {"storage": "common", "media": "common"},
    "LIFESTYLE": {"location": "common", "camera": "common", "storage": "common", "media": "common"},
    "PERSONALIZATION": {"storage": "common", "media": "common", "overlay": "common", "app_inventory": "common"},
    "AUTO_AND_VEHICLES": {"location": "core", "nearby": "core", "microphone": "common", "phone_state": "common"},
    "FILE_MANAGER": {"storage_all": "core", "storage": "core", "media": "core", "install_packages": "common"},
    "APP_STORE": {"install_packages": "core", "storage": "core", "app_inventory": "core"},
    "SECURITY": {"app_inventory": "core", "usage_stats": "core", "storage_all": "core", "autostart": "core",
                 "phone_state": "common", "overlay": "common", "accessibility": "common", "calls": "common",
                 "sms": "common", "contacts": "common", "device_admin": "common", "camera": "common",
                 "location": "common", "storage": "core", "media": "common"},
}

CATEGORY_ALIASES = {"SPORTS": "LIFESTYLE", "BEAUTY": "LIFESTYLE", "HOUSE_AND_HOME": "LIFESTYLE",
                    "PARENTING": "LIFESTYLE", "EVENTS": "LIFESTYLE", "ART_AND_DESIGN": "LIFESTYLE",
                    "MEDICAL": "HEALTH_AND_FITNESS", "COMICS": "BOOKS_AND_REFERENCE",
                    "LIBRARIES_AND_DEMO": "TOOLS", "VIDEO_PLAYERS_AND_EDITORS": "VIDEO_PLAYERS",
                    "MAPS": "MAPS_AND_NAVIGATION", "FOOD": "FOOD_AND_DRINK", "HEALTH": "HEALTH_AND_FITNESS",
                    "NEWS": "NEWS_AND_MAGAZINES", "MUSIC": "MUSIC_AND_AUDIO", "TRAVEL": "TRAVEL_AND_LOCAL",
                    "ANTIVIRUS": "SECURITY"}

# (category, regex over package + label + activity names). First strong match wins.
KEYWORD_RULES: List[Tuple[str, str]] = [
    ("FLASHLIGHT", r"flash ?light|torch"),
    ("CALCULATOR", r"calculator|calc\b"),
    ("FILE_MANAGER", r"file ?manager|file ?explorer"),
    ("SECURITY", r"antivirus|applock|app ?lock|vault|\bvpn\b"),
    ("MAPS_AND_NAVIGATION", r"\bmaps?\b|navigat|\bgps\b|transit"),
    ("PHOTOGRAPHY", r"camera|photo|selfie"),
    ("COMMUNICATION", r"messenger|\bchat\b|dialer|\bsms\b|voip|\bmail\b|email"),
    ("SOCIAL", r"social|community|friends"),
    ("MUSIC_AND_AUDIO", r"music|radio|podcast|\bsong"),
    ("VIDEO_PLAYERS", r"video|player|movie"),
    ("GAME", r"game|puzzle|arcade|ludo|casino|slots|racing"),
    ("FINANCE", r"\bbank|wallet|\bupi\b|loan|invest|finance|\bpay\b"),
    ("HEALTH_AND_FITNESS", r"fitness|health|workout|pedometer|yoga|diet"),
    ("WEATHER", r"weather|forecast"),
    ("EDUCATION", r"learn|school|study|course|education"),
    ("SHOPPING", r"shop|\bmart\b|\bcart\b"),
    ("FOOD_AND_DRINK", r"recipe|restaurant|food"),
    ("TRAVEL_AND_LOCAL", r"travel|hotel|flight|booking|\btrip"),
    ("PRODUCTIVITY", r"notes?\b|todo|calendar|office|document|\bpdf\b|scanner"),
    ("TOOLS", r"cleaner|booster|launcher|keyboard|utility|\btools?\b"),
]

# Libraries the APK ships with -> permissions that become justified.
LIBRARY_HINTS: List[Tuple[str, Dict[str, str], str]] = [
    (r"com\.google\.android\.gms\.maps|org\.osmdroid|com\.mapbox", {"location": "core", "location_background": "common"}, "map SDK"),
    (r"org\.webrtc|io\.agora|com\.twilio|org\.linphone", {"microphone": "core", "camera": "core"}, "voice/video call SDK"),
    (r"androidx\.camera|com\.otaliastudios\.cameraview", {"camera": "core"}, "camera library"),
    (r"com\.journeyapps\.barcodescanner|com\.google\.zxing|com\.google\.mlkit\.vision\.barcode", {"camera": "common"}, "QR/barcode scanner"),
    (r"com\.google\.android\.exoplayer|androidx\.media3", {"media": "common", "storage": "common"}, "media player library"),
]
AD_TRACKER_SDK = (r"com\.google\.android\.gms\.ads|com\.facebook\.ads|com\.applovin|com\.unity3d\.ads|com\.ironsource|"
                  r"com\.inmobi|com\.adjust|com\.appsflyer|io\.branch|com\.flurry|com\.mixpanel|com\.amplitude")


def normalize_category(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    c = re.sub(r"[^A-Z0-9]+", "_", str(raw).upper()).strip("_").replace("_AND_", "_AND_")
    if c.startswith("GAME"):
        return "GAME"
    c = CATEGORY_ALIASES.get(c, c)
    return c if c in CATEGORY_PROFILES else None


def infer_category(features: Dict[str, Any]) -> Tuple[Optional[str], float, str]:
    """-> (category, confidence 0-1, source)"""
    explicit = normalize_category(features.get("category"))
    if explicit:
        return explicit, 0.95, "store/user category"
    text = " ".join([
        str(features.get("package", "")), str(features.get("app_label", "")),
        " ".join(str(a).rsplit(".", 1)[-1] for a in (features.get("activities") or [])[:40]),
    ]).lower()
    for cat, rx in KEYWORD_RULES:
        if re.search(rx, text):
            return cat, 0.6, "inferred from app name/package"
    return None, 0.0, "unknown"


def library_info(features: Dict[str, Any]) -> Tuple[Dict[str, str], bool, List[str]]:
    libs = "\n".join(features.get("libraries") or [])
    grants: Dict[str, str] = {}
    notes: List[str] = []
    for rx, g, label in LIBRARY_HINTS:
        if libs and re.search(rx, libs):
            notes.append(label)
            for grp, lvl in g.items():
                if grp not in grants or LEVEL[lvl] < LEVEL[grants[grp]]:
                    grants[grp] = lvl
    ad_sdk = bool(libs and re.search(AD_TRACKER_SDK, libs)) or bool(features.get("trackers"))
    return grants, ad_sdk, notes


def _level(group: str, category: Optional[str], grants: Dict[str, str]) -> str:
    if category is None:
        base = "unknown"  # purpose unknown: cannot be called expected or unexpected
    else:
        prof = CATEGORY_PROFILES.get(category, {})
        base = prof.get(group) or ("unexpected" if GROUP_SENS.get(group, 0) >= 24 else "uncommon")
    if group in grants and LEVEL[grants[group]] < LEVEL[base]:
        return grants[group]
    return base


def _combos(declared_groups: Set[str], lvl: Dict[str, str], has_net: bool, ad_sdk: bool,
            bg_groups: Set[str], has_launcher: Optional[bool]) -> List[Dict[str, Any]]:
    def odd(g):  # declared and not justified by the app's purpose
        return g in declared_groups and LEVEL[lvl[g]] >= ODD

    out: List[Dict[str, Any]] = []

    def add(cid, title, pts, sev, why):
        out.append({"id": cid, "title": title, "points": pts, "severity": sev, "reason": why})

    if odd("sms") and has_net:
        sev = "critical" if (lvl["sms"] == "unexpected" and ("autostart" in declared_groups or ad_sdk)) else "high"
        add("sms_exfiltration", "Can read SMS and send data online", 30, sev,
            "SMS access plus internet lets an app copy messages (including OTPs) off the phone, and this app's purpose does not need SMS.")
    if "location_background" in declared_groups and "autostart" in declared_groups and odd("location_background"):
        stealth = has_launcher is False
        add("stealth_location_tracking", "Tracks location in the background from boot",
            35 if stealth else 20, "critical" if stealth else "high",
            "Background location with auto-start" + (" and no visible launcher icon" if stealth else "") + " allows continuous tracking the user may not notice.")
    if odd("microphone") and ("autostart" in declared_groups or "microphone" in bg_groups):
        add("ambient_audio_capture", "Can record audio in the background", 30, "critical",
            "Microphone access combined with auto-start or background use, in an app that does not need to listen.")
    if "overlay" in declared_groups and "accessibility" in declared_groups and (odd("overlay") or odd("accessibility")):
        add("overlay_accessibility_takeover", "Overlay + accessibility control", 40, "critical",
            "Drawing over other apps while controlling the screen is the classic pattern for stealing credentials and OTPs.")
    if odd("install_packages"):
        add("sideload_dropper", "Can install other apps", 25 + (10 if "overlay" in declared_groups else 0), "high",
            "Install-packages permission lets this app bring in other software; its purpose does not need that.")
    if odd("contacts") and (odd("sms") or odd("call_log")):
        add("contact_data_harvest", "Contacts + messages/call log harvesting", 25, "high",
            "Contacts together with SMS or call history gives a full picture of who the user talks to.")
    if odd("camera") and "camera" in bg_groups:
        add("visual_surveillance", "Camera used from background code", 30, "critical",
            "Camera API is called from a service/receiver, not a screen the user is looking at.")
    if odd("app_inventory") and ad_sdk:
        add("app_inventory_profiling", "Lists installed apps and ships ad/tracker SDKs", 15, "medium",
            "Installed-app lists are used to profile users for advertising.")
    if odd("device_admin"):
        add("device_admin_lock", "Requests device administrator rights", 30, "high",
            "Device admin makes an app hard to uninstall and can lock or wipe the phone.")
    if odd("usage_stats") and "app_inventory" in declared_groups:
        add("usage_spying", "Reads app usage history and installed apps", 20, "medium",
            "Combined usage and inventory data reveals daily habits.")
    return out


def analyze(features: Dict[str, Any]) -> Dict[str, Any]:
    declared: Set[str] = set(features.get("declared_permissions") or features.get("permissions") or [])
    used_perms = features.get("used_permissions")
    used_groups = features.get("used_api_groups")
    usage_known = used_perms is not None or used_groups is not None
    used_perms_set = set(used_perms or [])
    used_groups_set = set(used_groups or [])
    bg_groups = set(features.get("background_sensitive_groups") or [])
    has_net = (P + "INTERNET") in declared

    category, cat_conf, cat_source = infer_category(features)
    grants, ad_sdk, lib_notes = library_info(features)
    cat_label = (category or "this").replace("_", " ").title()
    purpose_known = category is not None

    audit: List[Dict[str, Any]] = []
    group_pts: Dict[str, List[float]] = {}
    declared_groups: Set[str] = set()
    levels: Dict[str, str] = {}

    for perm in sorted(declared):
        if perm not in PERMISSION_MAP:
            continue
        group, sens = PERMISSION_MAP[perm]
        declared_groups.add(group)
        level = _level(group, category, grants)
        levels[group] = level

        used = (perm in used_perms_set) or (group in used_groups_set)
        if used:
            ev_mult, ev = 1.0, "Observed in code"
        elif usage_known:
            ev_mult, ev = 0.55, "Declared, not seen in code"
        else:
            ev_mult, ev = 0.8, "Not verified"

        bg_mult = 1.35 if (group in bg_groups and level != "core") else 1.0
        ex_mult = 1.15 if (has_net and ad_sdk and group in DATA_GROUPS and LEVEL[level] >= LEVEL["uncommon"]) else 1.0
        pts = sens * LEVEL[level] * ev_mult * bg_mult * ex_mult
        group_pts.setdefault(group, []).append(pts)

        gname = GROUP_NAME.get(group, group)
        if not purpose_known:
            why = f"App purpose could not be determined, so {gname} could not be checked against what the app does"
        elif level == "unexpected":
            why = f"{cat_label} apps don't normally need {gname}"
        elif level == "uncommon":
            why = f"{gname.capitalize()} is unusual for {cat_label} apps"
        else:
            why = f"{gname.capitalize()} fits a {cat_label} app"
        if group in bg_groups:
            why += "; used from background code"
        audit.append({
            "permission": perm, "name": perm.split(".")[-1], "group": group, "fit": LEVEL_LABEL[level],
            "level": level, "evidence": ev, "points": round(pts, 2), "reason": why,
        })

    # same-group permissions (fine+coarse location, read+write storage) must not double count
    perm_points = 0.0
    for pts_list in group_pts.values():
        s = sorted(pts_list, reverse=True)
        perm_points += s[0] + 0.25 * sum(s[1:])

    combos = _combos(declared_groups, levels, has_net, ad_sdk, bg_groups, features.get("has_launcher_activity"))
    if not purpose_known:
        # Purpose unknown: a pattern is suspicious but not proven. Damp points, never "critical".
        for c in combos:
            c["points"] = round(c["points"] * 0.6, 1)
            if c["severity"] == "critical":
                c["severity"] = "high"
            c["reason"] += " (App purpose unknown, so this is a warning, not a verdict. Provide the app category for a sharper result.)"
    combo_points = sum(c["points"] for c in combos)
    total = perm_points + combo_points
    risk = round(100.0 * (1.0 - math.exp(-total / K)), 2)

    sensitive = [a for a in audit if GROUP_SENS.get(a["group"], 0) >= 14]
    fit_ok = [a for a in sensitive if LEVEL[a["level"]] <= LEVEL["common"]]
    justification = round(100 * len(fit_ok) / len(sensitive), 1) if sensitive else 100.0

    mismatches = sorted([a for a in audit if LEVEL[a["level"]] >= ODD],
                        key=lambda a: a["points"], reverse=True)

    top: List[str] = [f"{c['title']}: {c['reason']}" for c in sorted(combos, key=lambda c: c["points"], reverse=True)]
    for m in mismatches[:5]:
        top.append(f"{m['name']}: {m['reason']} ({m['evidence'].lower()}).")
    top = top[:6]
    if not top:
        top = [f"Sensitive permissions match what a {cat_label} app does." if purpose_known and sensitive
               else "No sensitive permission/behavior mismatch detected."]

    if not purpose_known and risk >= 25:
        verdict = "App purpose unknown: permissions could not be checked against what it does, and the set is broad"
    elif risk < 25:
        verdict = "Permissions match the app's purpose"
    elif risk < 55:
        verdict = "Some permissions look unnecessary for this app"
    else:
        verdict = "Permissions do not match what this app does"

    conf = 40.0
    conf += 20 if usage_known else 0
    conf += 20 if cat_conf >= 0.9 else (10 if cat_conf >= 0.5 else 0)
    conf += 10 if "background_sensitive_groups" in features else 0
    conf = min(95.0, conf)

    return {
        "heuristic_risk": risk,
        "top_factors": top,
        "mismatches": mismatches,
        "combos": combos,
        "permission_audit": sorted(audit, key=lambda a: a["points"], reverse=True),
        "profile": {"category": category, "confidence": cat_conf, "source": cat_source,
                    "library_hints": lib_notes, "has_ad_or_tracker_sdk": ad_sdk,
                    "purpose_known": purpose_known},
        "justification_percent": justification,
        "verdict": verdict,
        "critical_pattern": any(c["severity"] == "critical" for c in combos),
        "raw_points": round(total, 2),
        "confidence": conf,
    }
