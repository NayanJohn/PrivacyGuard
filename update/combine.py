from typing import Any, Dict, List, Optional
from .config import WEIGHT_ML, WEIGHT_STATIC, WEIGHT_HEURISTIC

# Recommended starting weights now that the smart brain does the real judging:
#   WEIGHT_ML = 0.25, WEIGHT_STATIC = 0.25, WEIGHT_HEURISTIC = 0.50   (edit in config.py)


def get_severity_band(score: float) -> str:
    """low < 30, medium 30-54, high 55-79, critical >= 80 (under-18 parent alert threshold)."""
    s = round(score)
    if s < 30:
        return "low"
    if s < 55:
        return "medium"
    if s < 80:
        return "high"
    return "critical"


def get_risk_label(severity: str) -> str:
    return {
        "low": "Low Concern",
        "medium": "Moderate Concern",
        "high": "Elevated Concern",
        "critical": "Critical Privacy Concern",
    }.get(severity, "Moderate Concern")


def _num(v) -> Optional[float]:
    try:
        return None if v is None else float(v)
    except (TypeError, ValueError):
        return None


def combine_scores(
    ml_res: Optional[Dict[str, Any]],
    heuristic_res: Optional[Dict[str, Any]],
    mobsf_res: Optional[Dict[str, Any]] = None,
    trackers: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Merges the components into one explainable risk score (higher = riskier):
      ml        : permission-statistics model (what the permissions COULD do)
      heuristic : smart_brain (does the app NEED these permissions? harmful patterns)
      static    : MobSF (static_risk = 100 - security_score)
    Any component that is missing/pending is skipped and the weights are renormalized.
    """
    ml_res = ml_res or {}
    heuristic_res = heuristic_res or {}

    ml_risk = _num(ml_res.get("ml_risk"))
    heuristic_risk = _num(heuristic_res.get("heuristic_risk"))

    mobsf_status = "unavailable"
    static_risk = None
    if mobsf_res:
        mobsf_status = mobsf_res.get("status", "unavailable")
        static_risk = _num(mobsf_res.get("static_risk"))
    is_mobsf_complete = mobsf_status == "complete" and static_risk is not None

    parts = {}
    if ml_risk is not None:
        parts["ml"] = (ml_risk, WEIGHT_ML)
    if heuristic_risk is not None:
        parts["heuristic"] = (heuristic_risk, WEIGHT_HEURISTIC)
    if is_mobsf_complete:
        parts["static"] = (static_risk, WEIGHT_STATIC)

    total_w = sum(w for _, w in parts.values())
    applied_weights = {"ml": 0.0, "static": 0.0, "heuristic": 0.0}
    if parts and total_w > 0:
        blend = sum(r * w for r, w in parts.values()) / total_w
        for k, (_, w) in parts.items():
            applied_weights[k] = round(w / total_w, 3)
    else:
        blend = 0.0

    # A confirmed harmful pattern (e.g. SMS + internet in a flashlight app) must not be
    # diluted away by clean-looking ML/MobSF numbers.
    floor_applied = False
    final_score = blend
    if heuristic_res.get("critical_pattern") and heuristic_risk is not None:
        floor = 0.85 * heuristic_risk
        if floor > final_score:
            final_score = floor
            floor_applied = True

    final_score = max(0, min(100, round(final_score)))
    severity = get_severity_band(final_score)
    risk_label = get_risk_label(severity)
    complete = mobsf_status not in ("pending", "running") and bool(parts)

    static_factors = (mobsf_res or {}).get("top_findings") or (
        ["MobSF static analysis completed."] if is_mobsf_complete
        else ["MobSF static analysis is pending, running, or unavailable."]
    )

    breakdown = {
        "ml": {
            "name": "Permission Risk Model",
            "score": ml_risk if ml_risk is not None else 0.0,
            "weight": applied_weights["ml"],
            "status": "complete" if ml_risk is not None else "unavailable",
            "description": "What the declared permissions could do on their own, ignoring the app's purpose.",
            "factors": ml_res.get("top_factors", []),
        },
        "static": {
            "name": "MobSF Static Security Risk",
            "score": static_risk if static_risk is not None else 0.0,
            "weight": applied_weights["static"],
            "status": mobsf_status,
            "description": "Automated reverse-engineering and security analysis (100 - mobsf_security_score).",
            "factors": static_factors,
        },
        "heuristic": {
            "name": "Smart Brain: Purpose vs Permission",
            "score": heuristic_risk if heuristic_risk is not None else 0.0,
            "weight": applied_weights["heuristic"],
            "status": "complete" if heuristic_risk is not None else "unavailable",
            "description": "Checks every sensitive permission against what the app is for, "
                           "and looks for harmful permission combinations and background use.",
            "factors": heuristic_res.get("top_factors", []),
        },
    }

    # Top factors: harmful patterns / mismatches first, then permission model, then MobSF.
    top_factors: List[str] = []
    top_factors.extend(heuristic_res.get("top_factors", []))
    top_factors.extend(ml_res.get("top_factors", [])[:2])
    if is_mobsf_complete and static_risk > 50:
        top_factors.append(f"MobSF static scan found elevated vulnerability risk ({round(static_risk)} pts).")
    seen = set()
    unique_top_factors = []
    for f in top_factors:
        if f not in seen:
            seen.add(f)
            unique_top_factors.append(f)
    unique_top_factors = unique_top_factors[:6]
    if not unique_top_factors:
        unique_top_factors = ["No significant risk indicators found."]

    # Trackers (copy; never mutate the caller's list)
    all_trackers = list(trackers or [])
    existing_names = {t.get("name") for t in all_trackers if isinstance(t, dict)}
    for t in (mobsf_res or {}).get("trackers") or []:
        t_name = t.get("name") if isinstance(t, dict) else str(t)
        if t_name and t_name not in existing_names:
            all_trackers.append({"name": t_name, "evidence": "Observed"})
            existing_names.add(t_name)

    # Recommendations: concrete, based on what the brain actually found
    mismatches = heuristic_res.get("mismatches", [])
    recommendations: List[str] = []
    if mismatches:
        names = ", ".join(m["name"] for m in mismatches[:3])
        recommendations.append(f"Open Android Settings > Apps > Permissions and deny or revoke: {names}.")
    if final_score >= 80:
        recommendations.append("Consider uninstalling this app or replacing it with one whose permissions match its purpose.")
    elif final_score >= 55:
        recommendations.append("Only allow sensitive permissions 'while using the app' and review them after updates.")
    elif not recommendations:
        recommendations.append("Permissions appear proportional to what the app does. Review prompts when new features ask for access.")

    if parts:
        w_text = ", ".join(f"{int(applied_weights[k] * 100)}% {label}"
                           for k, label in (("heuristic", "purpose-vs-permission"), ("ml", "permission model"),
                                            ("static", "MobSF")) if applied_weights[k] > 0)
        summary = f"Risk score {final_score}/100 ({risk_label}), blended from {w_text}."
    else:
        summary = "No engine component produced a result."
    if heuristic_res.get("verdict"):
        summary += f" {heuristic_res['verdict']}."
    if floor_applied:
        summary += " A harmful permission pattern raised the score above the plain blend."

    # Confidence from evidence actually available, not a constant
    confidence = _num(heuristic_res.get("confidence")) or _num(ml_res.get("confidence")) or 50.0
    if is_mobsf_complete:
        confidence = min(95.0, confidence + 10.0)

    return {
        "final_score": final_score,
        "score": final_score,
        "severity": severity,
        "risk_label": risk_label,
        "complete": complete,
        "mobsf_status": mobsf_status,
        "breakdown": breakdown,
        "top_factors": unique_top_factors,
        "trackers": all_trackers,
        "recommendations": recommendations,
        "summary": summary,
        "confidence": round(confidence, 1),
        # new, for the UI
        "verdict": heuristic_res.get("verdict"),
        "app_profile": heuristic_res.get("profile"),
        "mismatches": mismatches,
        "harmful_patterns": heuristic_res.get("combos", []),
        "permission_audit": heuristic_res.get("permission_audit", []),
        "floor_applied": floor_applied,
    }
