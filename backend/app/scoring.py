from statistics import mean
from .config import (
    WEIGHTS, RISK_BANDS, CLAIM_RELATION_RISK,
    DEFAULT_PERMISSION_SENSITIVITY, EVIDENCE_FACTORS
)
from .models import AuditInput, EvidenceLabel

def clamp(x: float) -> float:
    return max(0.0, min(100.0, x))

def evidence_factor(label: EvidenceLabel) -> float:
    # Observed contributes fully; inferred contributes partially.
    # Not Verified contributes no risk points.
    return EVIDENCE_FACTORS.get(label, {"Observed": 1.0, "Inferred": 0.65, "Not Verified": 0.0}.get(label, 0.0))

def mean_or_zero(values):
    return mean(values) if values else 0.0

def permission_score(audit: AuditInput):
    if not audit.permissions:
        return 0.0, [], 0.0

    sensitivity = mean([
        p.sensitivity for p in audit.permissions
    ])

    mismatch_values = []
    explanations = []
    for p in audit.permissions:
        mismatch = CLAIM_RELATION_RISK[p.claim_relation]
        mismatch_values.append(mismatch * evidence_factor(p.evidence))
        explanations.append({
            "factor": f"Permission: {p.permission}",
            "points_basis": mismatch,
            "evidence": p.evidence,
            "reason": p.reason or p.claim_relation
        })

    mismatch = mean_or_zero(mismatch_values)
    return sensitivity, explanations, mismatch

def benchmark_score(audit: AuditInput):
    deviations = []
    explanations = []
    for p in audit.permissions:
        freq = audit.benchmark_frequencies.get(p.permission)
        if freq is None:
            continue
        freq = clamp(freq)
        rarity = 100.0 - freq
        contribution = rarity * evidence_factor(p.evidence)
        deviations.append(contribution)
        explanations.append({
            "factor": f"Benchmark deviation: {p.permission}",
            "points_basis": contribution,
            "benchmark_frequency": freq,
            "reason": f"Permission appears in {freq:.1f}% of benchmark apps."
        })
    return mean_or_zero(deviations), explanations

def runtime_score(audit: AuditInput):
    if not audit.runtime_events:
        return 0.0, []
    values = []
    explanations = []
    for e in audit.runtime_events:
        mismatch_multiplier = 1.0 if not e.expected else 0.35
        value = e.severity * mismatch_multiplier * evidence_factor(e.evidence)
        values.append(value)
        explanations.append({
            "factor": f"Runtime: {e.event_type}",
            "points_basis": value,
            "evidence": e.evidence,
            "reason": e.description
        })
    return mean_or_zero(values), explanations

def tracker_score(audit: AuditInput):
    values = [
        t.tracker_score * evidence_factor(t.evidence)
        for t in audit.trackers
    ]
    explanations = [{
        "factor": f"Tracker/SDK: {t.name}",
        "points_basis": t.tracker_score * evidence_factor(t.evidence),
        "evidence": t.evidence,
        "reason": t.description
    } for t in audit.trackers]
    return mean_or_zero(values), explanations

def privacy_score(audit: AuditInput):
    score = clamp(mean_or_zero(audit.privacy_indicators))
    explanations = []
    if audit.privacy_indicators:
        explanations.append({
            "factor": "Sensitive Data Scope",
            "points_basis": score,
            "reason": "Evaluated declared scope across location, external storage, media, and background capabilities."
        })
    return score, explanations

def source_score(audit: AuditInput):
    # Risk score: verified official/store source = low risk.
    # Unknown/unverified source = higher risk.
    if audit.source_verified is True:
        return 10.0, [{"factor": "Source verification", "points_basis": 10, "reason": "Distribution source verified from official store signatures."}]
    if audit.source_verified is False:
        return 80.0, [{"factor": "Source verification", "points_basis": 80, "reason": "Distribution source not verified against official store."}]
    return 50.0, [{"factor": "Source verification", "points_basis": 50, "reason": "Distribution source verification unavailable for uploaded package."}]

def security_score(audit: AuditInput):
    s = audit.security
    values = []
    reasons = []

    if s.target_sdk is not None:
        if s.target_sdk < 28:
            values.append(90)
            reasons.append(f"Target SDK {s.target_sdk} is below Android 9 requirements.")
        elif s.target_sdk < 31:
            values.append(60)
            reasons.append(f"Target SDK {s.target_sdk} does not enforce modern Android 12 security standards.")
        elif s.target_sdk < 33:
            values.append(35)
            reasons.append(f"Target SDK {s.target_sdk} targets Android 12 or 12L.")
        else:
            values.append(10)
            reasons.append(f"Target SDK {s.target_sdk} targets modern Android releases.")

    if s.dangerous_exported_components > 0:
        val = min(100, 40 + 15 * s.dangerous_exported_components)
        values.append(val)
        reasons.append(f"{s.dangerous_exported_components} component(s) exported without permission restrictions.")
    elif s.exported_components > 0:
        values.append(20)
        reasons.append(f"{s.exported_components} exported component(s) declared with standard permissions.")

    if s.debuggable:
        values.append(85)
        reasons.append("Application has debuggable flag enabled in manifest.")

    if s.cleartext_traffic:
        values.append(70)
        reasons.append("Cleartext HTTP traffic is explicitly permitted in manifest configuration.")

    score = mean_or_zero(values)
    reason_str = " ".join(reasons) if reasons else "Derived from target SDK, exported components, debuggable flag and cleartext configuration."
    explanations = [{
        "factor": "Security metadata",
        "points_basis": score,
        "reason": reason_str
    }] if values else []
    return score, explanations

def confidence(audit: AuditInput) -> float:
    labels = []
    labels += [p.evidence for p in audit.permissions]
    labels += [e.evidence for e in audit.runtime_events]
    labels += [t.evidence for t in audit.trackers]

    if not labels:
        return 50.0

    values = [{"Observed": 1.0, "Inferred": 0.65, "Not Verified": 0.0}[x] for x in labels]
    return round(mean(values) * 100, 1)

def band_for(score: float):
    s = round(score)
    for low, high, label in RISK_BANDS:
        if low <= s <= high:
            return label
    return "High Concern (Requires Review)" if s > 100 else "Low Concern"

def calculate_score(audit: AuditInput):
    sensitivity, perm_explanations, mismatch = permission_score(audit)
    benchmark, benchmark_explanations = benchmark_score(audit)
    runtime, runtime_explanations = runtime_score(audit)
    tracker, tracker_explanations = tracker_score(audit)
    privacy, privacy_explanations = privacy_score(audit)
    source, source_explanations = source_score(audit)
    security, security_explanations = security_score(audit)

    # Static score combines actual permission sensitivity, claim mismatch,
    # exported-component exposure and security configuration.
    static = clamp(
        0.45 * sensitivity +
        0.35 * mismatch +
        0.10 * min(100, audit.security.dangerous_exported_components * 25) +
        0.10 * security
    )

    components = {
        "static": round(static, 2),
        "benchmark": round(benchmark, 2),
        "runtime": round(runtime, 2),
        "tracker": round(tracker, 2),
        "privacy": round(privacy, 2),
        "source": round(source, 2),
        "security": round(security, 2),
    }

    final_score = round(
        sum(components[k] * WEIGHTS[k] for k in WEIGHTS), 2
    )

    contributors = (
        perm_explanations + benchmark_explanations +
        runtime_explanations + tracker_explanations +
        privacy_explanations + source_explanations +
        security_explanations
    )
    contributors = sorted(
        contributors,
        key=lambda x: x.get("points_basis", 0),
        reverse=True
    )

    return {
        "risk_score": final_score,
        "risk_band": band_for(final_score),
        "confidence": confidence(audit),
        "weights": WEIGHTS,
        "components": components,
        "component_explanations": {
            "static": perm_explanations,
            "benchmark": benchmark_explanations,
            "runtime": runtime_explanations,
            "tracker": tracker_explanations,
            "privacy": privacy_explanations,
            "source": source_explanations,
            "security": security_explanations,
        },
        "contributors": contributors[:15],
        "formula": "sum(component_score * component_weight)",
        "note": "Risk score is evidence-derived; confidence separately reflects evidence quality."
    }
