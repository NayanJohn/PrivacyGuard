import json
from pathlib import Path
from typing import Any
from .config import (
    PERMISSION_SENSITIVITY,
    DEFAULT_PERMISSION_SENSITIVITY,
    PERMISSION_CLAIM_KEYWORDS,
    CATEGORY_CONTEXT_PERMISSIONS,
    CATEGORY_SLUGS,
    SLUG_TO_LABEL,
    AUTO_DETECT_KEYWORDS,
    BENCHMARKS_PATH,
    TRACKERS_PATH,
    get_permission_name,
    get_permission_purpose,
)
from .models import (
    AuditInput,
    PermissionFinding,
    TrackerFinding,
    SecurityMetadata,
)

# Load benchmarks and trackers
with open(BENCHMARKS_PATH, "r", encoding="utf-8") as f:
    BENCHMARKS_DATA = json.load(f)

with open(TRACKERS_PATH, "r", encoding="utf-8") as f:
    TRACKERS_DATA = json.load(f)

def resolve_category(category_input: str, claim: str) -> tuple[str, str, str]:
    """
    Returns (category_display_label, category_slug, category_source)
    category_source is either 'user' or 'auto_detected'
    """
    clean_cat = (category_input or "").strip()
    claim_lower = (claim or "").lower()

    if not clean_cat or clean_cat == "Auto-detect from claim" or clean_cat == "auto":
        # Auto-detect from claim text
        detected_label = None
        for label, keywords in AUTO_DETECT_KEYWORDS:
            if any(kw in claim_lower for kw in keywords):
                detected_label = label
                break
        
        if not detected_label:
            detected_label = "Utilities & Tools"
            
        slug = CATEGORY_SLUGS.get(detected_label, "utilities")
        return detected_label, slug, "auto_detected"
    else:
        slug = CATEGORY_SLUGS.get(clean_cat, clean_cat.lower().replace(" ", "-").replace("&", "and"))
        if slug not in BENCHMARKS_DATA:
            # Fallback search
            slug = "utilities"
        # Display label
        label = SLUG_TO_LABEL.get(slug, clean_cat)
        return label, slug, "user"

def classify_claim_relation(
    perm: str,
    claim: str,
    category_slug: str,
    sensitivity: float
) -> tuple[str, str]:
    """
    Classify relation:
    1. Matching claim keyword -> 'relevant'
    2. Category context -> 'context'
    3. sensitivity >= 60 -> 'unrelated'
    4. else -> 'unusual'
    Returns (relation, reason)
    """
    claim_lower = (claim or "").lower()
    keywords = PERMISSION_CLAIM_KEYWORDS.get(perm, [])

    # 1. Claim keyword match
    for kw in keywords:
        if kw in claim_lower:
            return "relevant", f"Directly aligns with stated capability in claim ('{kw}')."

    # 2. Category context match
    context_perms = CATEGORY_CONTEXT_PERMISSIONS.get(category_slug, [])
    if perm in context_perms:
        display_name = SLUG_TO_LABEL.get(category_slug, category_slug)
        return "context", f"Common auxiliary permission for {display_name} applications."

    # 3 & 4. Mismatch
    perm_readable = get_permission_name(perm)
    if sensitivity >= 60:
        return "unrelated", f"{perm_readable} accesses sensitive data not obviously justified by stated app capabilities."
    else:
        return "unusual", f"{perm_readable} is statistically uncommon for this app type and not described in claims."

def find_referencing_class(perm: str, facts: dict[str, Any]) -> str:
    """Find a class or component referencing or related to the permission for evidence details."""
    classes = facts.get("dex_classes", [])
    components = facts.get("activities", []) + facts.get("services", []) + facts.get("receivers", [])

    token_map = {
        "CAMERA": ["camera", "photo", "capture", "scanner"],
        "RECORD_AUDIO": ["audio", "record", "voice", "sound", "microphone"],
        "FINE_LOCATION": ["location", "gps", "geo", "tracker"],
        "COARSE_LOCATION": ["location", "network", "geo"],
        "READ_CONTACTS": ["contact", "people", "addressbook"],
        "READ_SMS": ["sms", "telephony", "message", "otp"],
        "READ_MEDIA_IMAGES": ["media", "image", "photo", "gallery"],
        "READ_EXTERNAL_STORAGE": ["storage", "file", "document"],
        "RECEIVE_BOOT_COMPLETED": ["boot", "receiver", "startup"],
        "WAKE_LOCK": ["wake", "lock", "power"],
        "INTERNET": ["network", "client", "http", "api", "socket"],
    }

    matching_tokens = []
    for k, v in token_map.items():
        if k in perm:
            matching_tokens = v
            break

    if matching_tokens:
        for c in classes:
            c_low = c.lower()
            if any(t in c_low for t in matching_tokens):
                short = c.split(".")[-1]
                return f"{short}.class"
        for comp in components:
            comp_low = comp.lower()
            if any(t in comp_low for t in matching_tokens):
                short = comp.split(".")[-1]
                return f"{short}.class"

    return ""

def format_category_comparison(perm: str, freq: float, category_slug: str) -> str:
    category_nouns = {
        "note-taking": "note-taking",
        "messaging": "messaging",
        "photography": "photography",
        "social": "social",
        "finance": "finance & banking",
        "games": "gaming",
        "utilities": "utility",
        "navigation": "navigation",
        "productivity": "productivity",
        "health-and-fitness": "health & fitness",
        "education": "education",
        "shopping": "shopping",
        "entertainment": "entertainment",
    }
    cat_noun = category_nouns.get(category_slug, "category")

    if freq < 15.0:
        return f"Only {freq:.1f}% of {cat_noun} apps request this."
    elif freq >= 85.0:
        return f"Standard across {freq:.1f}% of {cat_noun} applications."
    elif freq >= 50.0:
        return f"Common across {freq:.1f}% of {cat_noun} applications."
    else:
        return f"Used in {freq:.1f}% of {cat_noun} apps for optional features."

def compute_privacy_indicators(permissions: list[str]) -> list[float]:
    perm_set = set(permissions)
    indicators = []

    # Fine vs coarse location
    if "android.permission.ACCESS_FINE_LOCATION" in perm_set and "android.permission.ACCESS_COARSE_LOCATION" not in perm_set:
        indicators.append(75.0)
    elif "android.permission.ACCESS_FINE_LOCATION" in perm_set:
        indicators.append(65.0)
    elif "android.permission.ACCESS_COARSE_LOCATION" in perm_set:
        indicators.append(40.0)

    # Storage: broad vs scoped media
    has_broad = ("android.permission.READ_EXTERNAL_STORAGE" in perm_set or 
                 "android.permission.WRITE_EXTERNAL_STORAGE" in perm_set)
    has_scoped = ("android.permission.READ_MEDIA_IMAGES" in perm_set or 
                  "android.permission.READ_MEDIA_VIDEO" in perm_set)
    if has_broad:
        indicators.append(65.0)
    elif has_scoped:
        indicators.append(35.0)

    # Telephony / SMS / Contacts
    has_contacts = "android.permission.READ_CONTACTS" in perm_set or "android.permission.WRITE_CONTACTS" in perm_set
    has_sms = any(p in perm_set for p in ("android.permission.READ_SMS", "android.permission.SEND_SMS", "android.permission.RECEIVE_SMS"))
    has_calls = "android.permission.READ_CALL_LOG" in perm_set or "android.permission.CALL_PHONE" in perm_set

    if has_contacts and (has_sms or has_calls):
        indicators.append(90.0)
    elif has_sms:
        indicators.append(85.0)
    elif has_contacts:
        indicators.append(70.0)
    elif has_calls:
        indicators.append(65.0)

    # Audio & camera sensors
    has_cam = "android.permission.CAMERA" in perm_set
    has_mic = "android.permission.RECORD_AUDIO" in perm_set
    if has_cam and has_mic:
        indicators.append(75.0)
    elif has_cam:
        indicators.append(50.0)
    elif has_mic:
        indicators.append(60.0)

    # Background service flags
    if "android.permission.RECEIVE_BOOT_COMPLETED" in perm_set:
        indicators.append(40.0)
    if "android.permission.WAKE_LOCK" in perm_set:
        indicators.append(30.0)

    if not indicators and perm_set:
        indicators.append(15.0)

    return indicators

def extract_trackers(facts: dict[str, Any]) -> list[TrackerFinding]:
    dex_classes = set(facts.get("dex_classes", []))
    manifest_components = (
        facts.get("activities", []) +
        facts.get("services", []) +
        facts.get("receivers", []) +
        facts.get("providers", [])
    )
    manifest_str = " ".join(manifest_components)

    findings: list[TrackerFinding] = []
    for tracker in TRACKERS_DATA:
        prefix = tracker["prefix"]
        # Check DEX classes first (Observed)
        found_in_dex = any(c.startswith(prefix) for c in dex_classes)
        if found_in_dex:
            findings.append(TrackerFinding(
                name=tracker["name"],
                tracker_score=tracker["tracker_score"],
                evidence="Observed",
                description=tracker["description"]
            ))
            continue

        # Check manifest components (Inferred)
        if prefix in manifest_str:
            findings.append(TrackerFinding(
                name=tracker["name"],
                tracker_score=tracker["tracker_score"],
                evidence="Inferred",
                description=tracker["description"]
            ))

    return findings

def build_audit_from_apk_facts(
    facts: dict[str, Any],
    claim: str,
    category_input: str
) -> tuple[AuditInput, dict[str, Any]]:
    """
    Builds the AuditInput and returns (audit_input, pipeline_metadata)
    """
    category_label, category_slug, category_source = resolve_category(category_input, claim)

    # Benchmarks for category
    cat_benchmarks = BENCHMARKS_DATA.get(category_slug, {})
    meta = cat_benchmarks.get("_meta", {})
    sample_size = meta.get("sample_size", 4280 if category_slug == "note-taking" else 3000)

    benchmark_frequencies: dict[str, float] = {}
    for p, freq in cat_benchmarks.items():
        if p != "_meta" and isinstance(freq, (int, float)):
            benchmark_frequencies[p] = float(freq)

    # Permissions
    permission_findings: list[PermissionFinding] = []
    declared_perms = facts.get("permissions", [])

    for perm in declared_perms:
        sensitivity = float(PERMISSION_SENSITIVITY.get(perm, DEFAULT_PERMISSION_SENSITIVITY))
        relation, reason = classify_claim_relation(perm, claim, category_slug, sensitivity)
        permission_findings.append(PermissionFinding(
            permission=perm,
            sensitivity=sensitivity,
            claim_relation=relation,
            evidence="Observed",
            reason=reason
        ))

    # Trackers
    trackers = extract_trackers(facts)

    # Privacy indicators
    privacy_indicators = compute_privacy_indicators(declared_perms)

    # Security metadata
    security = SecurityMetadata(
        target_sdk=facts.get("target_sdk"),
        min_sdk=facts.get("min_sdk"),
        exported_components=facts.get("exported_components", 0),
        dangerous_exported_components=facts.get("dangerous_exported_components", 0),
        debuggable=facts.get("debuggable", False),
        cleartext_traffic=facts.get("cleartext_traffic", False),
    )

    audit_input = AuditInput(
        app_name=facts.get("app_name", "Unknown"),
        package_name=facts.get("package_name", "unknown.package"),
        category=category_slug,
        claim=claim,
        permissions=permission_findings,
        runtime_events=[],  # Uploaded APKs have no runtime events
        trackers=trackers,
        security=security,
        source_verified=None,  # Uploaded APK has no store verification
        source_type="uploaded-apk",
        privacy_indicators=privacy_indicators,
        benchmark_frequencies=benchmark_frequencies,
    )

    pipeline_meta = {
        "category_label": category_label,
        "category_slug": category_slug,
        "category_source": category_source,
        "sample_size": sample_size,
    }

    return audit_input, pipeline_meta
