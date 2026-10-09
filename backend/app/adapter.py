import re
from typing import Any, Optional
from datetime import datetime, timezone, timedelta
from .config import (
    SCORE_BANDS_PAYLOAD,
    band_for,
    get_permission_name,
    get_permission_purpose,
)
from .models import (
    AuditInput,
    AuditResultOut,
    AppMetadataOut,
    ScoreBandOut,
    ComponentOut,
    FindingOut,
)
from .pipeline import format_category_comparison, find_referencing_class

RELEVANCE_MAP = {
    "relevant": "required",
    "context": "potentially_relevant",
    "unusual": "suspicious",
    "unrelated": "not_justified",
}

EVIDENCE_MAP = {
    "Observed": "observed",
    "Inferred": "inferred",
    "Not Verified": "not_verified",
}

FORBIDDEN_WORDS = ["malware", "dangerous", "malicious"]

def sanitize_text(text: str) -> str:
    """Ensure no forbidden words leak into user-facing responses."""
    cleaned = text
    cleaned = re.sub(r"\bmalware\b", "unverified software", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bdangerous\b", "sensitive", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bmalicious\b", "not obviously justified", cleaned, flags=re.IGNORECASE)
    return cleaned

def sanitize_obj(obj: Any) -> Any:
    if isinstance(obj, str):
        return sanitize_text(obj)
    elif isinstance(obj, list):
        return [sanitize_obj(x) for x in obj]
    elif isinstance(obj, dict):
        return {k: sanitize_obj(v) for k, v in obj.items()}
    return obj

def build_components(
    engine_result: dict[str, Any],
    audit_input: AuditInput,
    facts: dict[str, Any]
) -> list[ComponentOut]:
    comp_scores = engine_result.get("components", {})
    comp_expl = engine_result.get("component_explanations", {})
    v2_breakdown = engine_result.get("breakdown", {})

    components_list = []

    # If v2 3-component breakdown is present, add the headline components first
    if v2_breakdown:
        ml_info = v2_breakdown.get("ml", {})
        mobsf_info = v2_breakdown.get("static", {})
        heur_info = v2_breakdown.get("heuristic", {})

        components_list.append(ComponentOut(
            name="Hand-Weighted Permission Risk Model",
            weight=int(round(float(ml_info.get("weight", 0.25)) * 100)),
            score=float(ml_info.get("score", 0.0)),
            description="Hand-weighted permission risk model evaluating declared and bytecode-active sensitive permissions.",
            verified=True,
            reasons=ml_info.get("factors", [])[:3] or ["Evaluated permission topology and confirmed bytecode invocations."],
        ))

        components_list.append(ComponentOut(
            name="MobSF Static Security Risk",
            weight=int(round(float(mobsf_info.get("weight", 0.35)) * 100)),
            score=float(mobsf_info.get("score", 0.0)),
            description="Automated reverse-engineering and security analysis (100 - mobsf_security_score).",
            verified=(mobsf_info.get("status") == "complete"),
            reasons=mobsf_info.get("factors", [])[:3] or ["MobSF static analysis is pending or running in background."],
        ))

        components_list.append(ComponentOut(
            name="Privacy Heuristics & Policy Risk",
            weight=int(round(float(heur_info.get("weight", 0.25)) * 100)),
            score=float(heur_info.get("score", 0.0)),
            description="Rule-based analysis for sensitive sensor combinations, cleartext traffic, and category divergence.",
            verified=True,
            reasons=heur_info.get("factors", [])[:3] or ["Evaluated sensitive permission combos, exported components, and cleartext traffic."],
        ))

    # 1. Claim-to-Permission Divergence (Weight: 50, Static, verified=True)
    perm_reasons = []
    unrelated_findings = [p for p in audit_input.permissions if p.claim_relation in ("unrelated", "unusual")]
    if unrelated_findings:
        for p in unrelated_findings[:4]:
            p_name = get_permission_name(p.permission)
            perm_reasons.append(sanitize_text(f"{p_name} is requested, but claims do not describe this capability."))
    else:
        if audit_input.permissions:
            perm_reasons.append("Declared permissions align closely with user-facing functional claims.")
        else:
            perm_reasons.append("No special permissions declared; no claim divergence observed.")

    row1 = ComponentOut(
        name="Claim-to-Permission Divergence",
        weight=50,
        score=float(comp_scores.get("static", 0.0)),
        description="Analyzes discrepancy between user-facing stated capabilities and declared permissions.",
        verified=True,
        reasons=perm_reasons[:4],
    )

    # 2. Peer Category Benchmark Deviation (Weight: 10, Benchmark)
    benchmark_reasons = []
    has_benchmark_freq = False
    for p in audit_input.permissions:
        freq = audit_input.benchmark_frequencies.get(p.permission)
        if freq is not None:
            has_benchmark_freq = True
            p_name = get_permission_name(p.permission)
            if freq < 15.0:
                benchmark_reasons.append(sanitize_text(f"Only {freq:.1f}% of peer apps request {p_name}."))
            elif freq >= 80.0:
                benchmark_reasons.append(sanitize_text(f"{p_name} aligns with {freq:.1f}% category baseline."))

    if not benchmark_reasons:
        if has_benchmark_freq:
            benchmark_reasons.append("Permission declaration frequencies align with peer category baselines.")
        else:
            benchmark_reasons.append("Category baseline comparisons applied across declared permissions.")

    row2 = ComponentOut(
        name="Peer Category Benchmark Deviation",
        weight=10,
        score=float(comp_scores.get("benchmark", 0.0)),
        description="Measures permission declaration frequencies against peer category apps.",
        verified=has_benchmark_freq,
        reasons=benchmark_reasons[:4],
    )

    # 3. Sensitive Data Scope (Weight: 10, Privacy, verified=True)
    privacy_reasons = []
    perm_set = {p.permission for p in audit_input.permissions}
    if "android.permission.ACCESS_FINE_LOCATION" in perm_set and "android.permission.ACCESS_COARSE_LOCATION" not in perm_set:
        privacy_reasons.append("Declares ACCESS_FINE_LOCATION instead of scoped approximate location.")
    if "android.permission.READ_EXTERNAL_STORAGE" in perm_set:
        privacy_reasons.append("Declares broad shared external storage access instead of scoped media contract.")
    if "android.permission.READ_CONTACTS" in perm_set:
        privacy_reasons.append("Requests full device contact address book reading.")
    if any(p in perm_set for p in ("android.permission.READ_SMS", "android.permission.RECEIVE_SMS")):
        privacy_reasons.append("Direct SMS message access requested instead of modern user consent API.")
    if "android.permission.RECEIVE_BOOT_COMPLETED" in perm_set:
        privacy_reasons.append("BOOT_COMPLETED receiver declared to wake process upon device startup.")
    if "android.permission.WAKE_LOCK" in perm_set:
        privacy_reasons.append("WAKE_LOCK declared, keeping CPU active during background operations.")
    if not privacy_reasons:
        privacy_reasons.append("App uses scoped or minimal sensitive data access declarations.")

    row3 = ComponentOut(
        name="Sensitive Data Scope",
        weight=10,
        score=float(comp_scores.get("privacy", 0.0)),
        description="Evaluates broad vs scoped data access and sensitive permission combinations.",
        verified=True,
        reasons=privacy_reasons[:4],
    )

    # 4. Third-Party SDK Surface (Weight: 10, Tracker, verified=True)
    tracker_reasons = []
    if audit_input.trackers:
        for t in audit_input.trackers[:4]:
            tracker_reasons.append(sanitize_text(f"Contains {t.name} ({t.description.lower()})."))
    else:
        tracker_reasons.append("No known third-party advertising or telemetry SDK signatures detected in bytecode.")

    row4 = ComponentOut(
        name="Third-Party SDK Surface",
        weight=10,
        score=float(comp_scores.get("tracker", 0.0)),
        description="Detected advertising, telemetry, and tracking SDK signatures embedded in package bytecode.",
        verified=True,
        reasons=tracker_reasons[:4],
    )

    # 5. Runtime Dynamic Behavior (Weight: 10, Runtime, verified=False for uploaded APKs)
    row5 = ComponentOut(
        name="Runtime Dynamic Behavior",
        weight=10,
        score=0.0,
        description="Live observation of network traffic and runtime authorization prompts.",
        verified=False,
        reasons=[
            "Not Verified: static analyzer does not execute the APK.",
            "Available in the PrivacyGuard Android app runtime monitor."
        ],
    )

    # 6. Source Verification (Weight: 5, Source, verified=False when source_verified is None)
    source_verified = audit_input.source_verified is True
    if audit_input.source_verified is None:
        source_score = 0.0
        source_verified = False
        source_reasons = [
            "Not Verified: uploaded package distribution source cannot be verified against official store signatures.",
            "Direct file uploads lack cryptographic app store verification."
        ]
    elif audit_input.source_verified:
        source_score = float(comp_scores.get("source", 10.0))
        source_reasons = ["App distribution verified from official package repository."]
    else:
        source_score = float(comp_scores.get("source", 80.0))
        source_reasons = ["App package origin is unverified or modified."]

    row6 = ComponentOut(
        name="Source Verification",
        weight=5,
        score=source_score,
        description="Verifies official cryptographic store origin signatures and packaging integrity.",
        verified=source_verified,
        reasons=source_reasons,
    )

    # 7. Security Configuration (Weight: 5, Security, verified=True)
    sec_reasons = []
    target_sdk = facts.get("target_sdk")
    if target_sdk:
        if target_sdk >= 33:
            sec_reasons.append(f"Target SDK {target_sdk} complies with modern Android platform security policies.")
        else:
            sec_reasons.append(f"Target SDK {target_sdk} is below modern Android platform requirements.")
    
    unprotected = facts.get("dangerous_exported_components", 0)
    if unprotected > 0:
        sec_reasons.append(f"{unprotected} exported component(s) handle intents without permission restrictions.")
    elif facts.get("exported_components", 0) > 0:
        sec_reasons.append(f"{facts.get('exported_components')} exported component(s) declared with standard protections.")

    if facts.get("debuggable"):
        sec_reasons.append("Debuggable flag is enabled in Android manifest.")
    if facts.get("cleartext_traffic"):
        sec_reasons.append("Cleartext HTTP traffic is explicitly permitted in manifest configuration.")

    if not sec_reasons:
        sec_reasons.append("Standard Android manifest security flags verified.")

    row7 = ComponentOut(
        name="Security Configuration",
        weight=5,
        score=float(comp_scores.get("security", 0.0)),
        description="Static evaluation of target SDK version, exported components, and manifest security flags.",
        verified=True,
        reasons=sec_reasons[:4],
    )

    return components_list + [row1, row2, row3, row4, row5, row6, row7] if components_list else [row1, row2, row3, row4, row5, row6, row7]

def build_findings(
    audit_input: AuditInput,
    facts: dict[str, Any],
    category_slug: str
) -> list[FindingOut]:
    findings: list[FindingOut] = []

    # Map each permission to FindingOut
    for idx, p in enumerate(audit_input.permissions, start=1):
        perm = p.permission
        name = get_permission_name(perm)
        purpose = get_permission_purpose(perm)
        relevance_frontend = RELEVANCE_MAP.get(p.claim_relation, "potentially_relevant")
        evidence_frontend = EVIDENCE_MAP.get(p.evidence, "observed")
        
        freq = audit_input.benchmark_frequencies.get(perm, 0.0)
        cat_comp = format_category_comparison(perm, freq, category_slug)

        ref_class = find_referencing_class(perm, facts)
        if ref_class:
            ev_details = f"Declared in AndroidManifest.xml and referenced in {ref_class}."
        else:
            ev_details = "Declared in AndroidManifest.xml."

        findings.append(FindingOut(
            id=f"perm-{idx}",
            permission=perm,
            name=sanitize_text(name),
            purpose=sanitize_text(purpose),
            relevance=relevance_frontend,
            benchmark_pct=round(freq, 1),
            evidence_type=evidence_frontend,
            evidence_details=sanitize_text(ev_details),
            category_comparison=sanitize_text(cat_comp),
        ))

    # Sort findings by risk:
    # 1. Relevance: not_justified (1) > suspicious (2) > potentially_relevant (3) > required (4)
    # 2. Sensitivity: higher first
    relevance_order = {
        "not_justified": 1,
        "suspicious": 2,
        "potentially_relevant": 3,
        "required": 4,
    }

    # Helper to get sensitivity
    sens_map = {p.permission: p.sensitivity for p in audit_input.permissions}

    findings.sort(
        key=lambda f: (
            relevance_order.get(f.relevance, 5),
            -sens_map.get(f.permission, 50.0)
        )
    )

    # Re-index ids sequentially after sorting (perm-1, perm-2, ...)
    sorted_findings = findings[:20]
    for i, f in enumerate(sorted_findings, start=1):
        f.id = f"perm-{i}"

    return sorted_findings

def generate_recommendations(
    findings: list[FindingOut],
    audit_input: AuditInput,
    category_label: str
) -> list[str]:
    recs = []

    unjustified = [f for f in findings if f.relevance == "not_justified"]
    if unjustified:
        names = ", ".join(f.name for f in unjustified[:2])
        recs.append(
            f"Review whether you need {names} features in this application before granting permission prompts on your device."
        )

    suspicious = [f for f in findings if f.relevance == "suspicious"]
    if suspicious and len(recs) < 3:
        p_name = suspicious[0].name
        recs.append(
            f"Inspect optional settings to see if {p_name} can be disabled if not actively needed."
        )

    if audit_input.trackers and len(recs) < 3:
        recs.append(
            "Check if the app offers an offline mode or settings toggle to disable diagnostic telemetry and third-party advertising SDKs."
        )

    if audit_input.security.debuggable and len(recs) < 3:
        recs.append(
            "Note that the debuggable flag is enabled, which is recommended only in pre-release development builds."
        )

    if len(recs) < 3:
        recs.append(
            f"Verify that declared permissions remain consistent with your intended workflow for {category_label}."
        )

    # Always end with the Android app line
    recs.append(
        "If you have already installed this app, use the PrivacyGuard Android app to inspect whether sensitive permissions have been actively granted at runtime."
    )

    return [sanitize_text(r) for r in recs[:5]]

def adapt_to_frontend_result(
    audit_id: str,
    status: str,
    stage: str,
    error: Optional[str],
    created_at: str,
    expires_at: str,
    claim: str,
    category_label: str,
    category_slug: str,
    category_source: str,
    engine_result: dict[str, Any],
    audit_input: AuditInput,
    facts: dict[str, Any]
) -> AuditResultOut:
    """
    Transforms internal engine result into exact frontend AuditResultOut schema.
    """
    score_val = engine_result.get("final_score", engine_result.get("score", engine_result.get("risk_score", 0.0)))
    final_score = int(round(float(score_val)))
    severity = engine_result.get("severity")
    if not severity:
        if final_score < 30:
            severity = "low"
        elif final_score < 55:
            severity = "medium"
        elif final_score < 80:
            severity = "high"
        else:
            severity = "critical"

    risk_label = engine_result.get("risk_label", band_for(final_score))

    score_bands = [ScoreBandOut(**b) for b in SCORE_BANDS_PAYLOAD]
    components = build_components(engine_result, audit_input, facts)
    findings = build_findings(audit_input, facts, category_slug)
    sample_size = facts.get("sample_size", 4280 if category_slug == "note-taking" else 3000)
    recommendations = engine_result.get("recommendations") or generate_recommendations(findings, audit_input, category_label)

    app_meta = AppMetadataOut(
        app_name=sanitize_text(facts.get("app_name", "Unknown")),
        package_name=facts.get("package_name", "unknown.package"),
        version_name=facts.get("version_name", "1.0.0"),
        min_sdk=int(facts.get("min_sdk") or 21),
        target_sdk=int(facts.get("target_sdk") or 33),
        apk_sha256=facts.get("apk_sha256", "0" * 64),
    )

    result = AuditResultOut(
        audit_id=audit_id,
        status=status,
        stage=stage,
        error=error,
        created_at=created_at,
        expires_at=expires_at,
        source="Uploaded APK",
        app=app_meta,
        claim=claim,
        category=category_label,
        category_source=category_source,  # "user" | "auto_detected"
        score=final_score,
        final_score=engine_result.get("final_score", final_score),
        risk_label=risk_label,
        score_bands=score_bands,
        components=components,
        findings=findings,
        benchmark_sample_size=sample_size,
        runtime_note="Runtime behavior was not observed for uploaded APKs (Not Verified).",
        recommendations=recommendations,
        confidence=engine_result.get("confidence", 85.0),
        severity=severity,
        mobsf_status=engine_result.get("mobsf_status", "unavailable"),
        top_factors=engine_result.get("top_factors", []),
        trackers=engine_result.get("trackers", []),
        complete=engine_result.get("complete"),
        summary=engine_result.get("summary"),
        breakdown=engine_result.get("breakdown"),
        verdict=engine_result.get("verdict"),
        app_profile=engine_result.get("app_profile"),
        mismatches=engine_result.get("mismatches"),
        harmful_patterns=engine_result.get("harmful_patterns"),
        permission_audit=engine_result.get("permission_audit"),
        floor_applied=engine_result.get("floor_applied"),
    )

    return result
