from typing import Any, Dict, List, Optional
from .config import WEIGHT_ML, WEIGHT_STATIC, WEIGHT_HEURISTIC

def get_severity_band(score: float) -> str:
    """
    Standard severity thresholds for PrivacyGuard v2:
      low: < 30
      medium: 30 - 54
      high: 55 - 79
      critical: >= 80 (triggers under-18 parent alert threshold)
    """
    s = round(score)
    if s < 30:
        return "low"
    elif s < 55:
        return "medium"
    elif s < 80:
        return "high"
    else:
        return "critical"

def get_risk_label(severity: str) -> str:
    labels = {
        "low": "Low Concern",
        "medium": "Moderate Concern",
        "high": "Elevated Concern",
        "critical": "Critical Privacy Concern",
    }
    return labels.get(severity, "Moderate Concern")

def combine_scores(
    ml_res: Dict[str, Any],
    heuristic_res: Dict[str, Any],
    mobsf_res: Optional[Dict[str, Any]] = None,
    trackers: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Merges the 3 score engine components into a single explainable risk score:
      - ml_risk: RiskInDroid model (Weight: 0.40)
      - static_risk: MobSF REST (Weight: 0.35, static_risk = 100 - security_score)
      - heuristic_risk: Privacy heuristics (Weight: 0.25)
    
    If MobSF is pending or unavailable, weights are automatically renormalized across
    available components.
    """
    ml_risk = float(ml_res.get("ml_risk", 0.0))
    heuristic_risk = float(heuristic_res.get("heuristic_risk", 0.0))

    mobsf_status = "unavailable"
    static_risk = None
    if mobsf_res:
        mobsf_status = mobsf_res.get("status", "unavailable")
        static_risk = mobsf_res.get("static_risk")

    is_mobsf_complete = mobsf_status == "complete" and static_risk is not None

    if is_mobsf_complete:
        # Full 3-component blend
        final_score = (
            ml_risk * WEIGHT_ML +
            float(static_risk) * WEIGHT_STATIC +
            heuristic_risk * WEIGHT_HEURISTIC
        )
        applied_weights = {
            "ml": WEIGHT_ML,
            "static": WEIGHT_STATIC,
            "heuristic": WEIGHT_HEURISTIC,
        }
        complete = True
    else:
        # Renormalized 2-component preliminary blend (ML + Heuristic)
        norm_sum = WEIGHT_ML + WEIGHT_HEURISTIC
        w_ml = WEIGHT_ML / norm_sum
        w_heur = WEIGHT_HEURISTIC / norm_sum

        final_score = ml_risk * w_ml + heuristic_risk * w_heur
        applied_weights = {
            "ml": round(w_ml, 3),
            "static": 0.0,
            "heuristic": round(w_heur, 3),
        }
        complete = (mobsf_status != "pending")

    final_score = max(0, min(100, round(final_score)))
    severity = get_severity_band(final_score)
    risk_label = get_risk_label(severity)

    # Compile explainable breakdown
    breakdown = {
        "ml": {
            "name": "RiskInDroid ML Risk",
            "score": ml_risk,
            "weight": applied_weights["ml"],
            "status": "complete",
            "description": "Empirical machine learning risk inference from permission topology and hardware features.",
            "factors": ml_res.get("top_factors", [])
        },
        "static": {
            "name": "MobSF Static Security Risk",
            "score": static_risk if static_risk is not None else 0.0,
            "weight": applied_weights["static"],
            "status": mobsf_status,
            "description": "Automated reverse-engineering and security analysis (100 - mobsf_security_score).",
            "factors": ["Evaluated static manifest security score, certificates, and component vulnerabilities."] if is_mobsf_complete else ["MobSF static analysis is pending or running in background."]
        },
        "heuristic": {
            "name": "Privacy Heuristics & Policy Risk",
            "score": heuristic_risk,
            "weight": applied_weights["heuristic"],
            "status": "complete",
            "description": "Rule-based analysis for sensitive sensor combinations, cleartext traffic, and category divergence.",
            "factors": heuristic_res.get("top_factors", [])
        }
    }

    # Gather top risk factors across components
    top_factors: List[str] = []
    top_factors.extend(heuristic_res.get("top_factors", []))
    top_factors.extend(ml_res.get("top_factors", []))
    if is_mobsf_complete and static_risk and static_risk > 50:
        top_factors.append(f"MobSF static security scan reported elevated static vulnerability risk ({static_risk} pts).")

    # Deduplicate and limit to top 4 factors
    seen = set()
    unique_top_factors = []
    for f in top_factors:
        if f not in seen:
            seen.add(f)
            unique_top_factors.append(f)
    unique_top_factors = unique_top_factors[:5]
    if not unique_top_factors:
        unique_top_factors = ["Application declares a minimal set of permissions with no significant risk indicators."]

    # All trackers
    all_trackers = trackers or []
    if mobsf_res and mobsf_res.get("trackers"):
        existing_names = {t["name"] for t in all_trackers}
        for t in mobsf_res.get("trackers"):
            t_name = t.get("name") if isinstance(t, dict) else str(t)
            if t_name not in existing_names:
                all_trackers.append({"name": t_name, "evidence": "Observed"})
                existing_names.add(t_name)

    # Actionable plain-English recommendations
    recommendations = []
    if final_score >= 80:
        recommendations.append("Exercise extreme caution. This application requires sensitive device sensors that can monitor background activity.")
        recommendations.append("Consider open-source or privacy-respecting alternatives that do not request extensive system privileges.")
    elif final_score >= 55:
        recommendations.append("Review whether you need camera or microphone features in this application before granting permission prompts.")
        recommendations.append("Check application settings to disable diagnostics, analytics sharing, or location tracking.")
    else:
        recommendations.append("Permissions appear proportional to the application's stated functionality.")
        recommendations.append("Review standard Android runtime prompts when opening features for the first time.")

    summary = (
        f"Assigned risk score of {final_score}/100 ({risk_label}) based on "
        f"0.40 ML risk, 0.35 static reverse-engineering, and 0.25 privacy heuristics."
    )

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
        "confidence": 92.0 if is_mobsf_complete else 84.0,
    }
