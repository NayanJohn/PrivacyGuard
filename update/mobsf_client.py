import os
import httpx
from typing import Any, Dict, Optional
from loguru import logger
from .config import MOBSF_URL, MOBSF_API_KEY


_SEV_ORDER = {"high": 0, "critical": 0, "warning": 1, "medium": 1, "info": 2, "low": 2}


def _extract_findings(report: Dict[str, Any]) -> list:
    """Best-effort across MobSF versions: manifest + code findings, worst first."""
    out = []
    ma = report.get("manifest_analysis")
    items = ma.get("manifest_findings", []) if isinstance(ma, dict) else (ma or [])
    for it in items:
        if isinstance(it, dict):
            out.append({"title": it.get("title") or it.get("rule") or "Manifest issue",
                        "severity": str(it.get("severity", "info")).lower()})
    ca = report.get("code_analysis")
    ca = ca.get("findings", ca) if isinstance(ca, dict) else {}
    if isinstance(ca, dict):
        for rule, v in ca.items():
            meta = (v or {}).get("metadata", {}) if isinstance(v, dict) else {}
            out.append({"title": meta.get("description") or rule,
                        "severity": str(meta.get("severity", "info")).lower()})
    out.sort(key=lambda f: _SEV_ORDER.get(f["severity"], 3))
    return out


class MobSFClient:
    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        self.base_url = (base_url or MOBSF_URL).rstrip("/")
        self.api_key = api_key or MOBSF_API_KEY
        self.headers = {"Authorization": self.api_key} if self.api_key else {}

    async def is_available(self) -> bool:
        """Check if MobSF service is running and responsive."""
        if not self.base_url:
            return False
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/v1/health", headers=self.headers)
                return res.status_code in (200, 401, 403)
        except Exception:
            return False

    async def analyze_apk(self, apk_path: str) -> Dict[str, Any]:
        """
        Uploads and scans an APK via MobSF REST API.
        Extracts MobSF security score and computes:
        static_risk = 100 - mobsf_security_score.
        """
        if not os.path.exists(apk_path):
            return {
                "status": "failed",
                "error": "APK file does not exist",
                "static_risk": None
            }

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(900.0, connect=10.0)) as client:
                # 1. Upload APK
                with open(apk_path, "rb") as f:
                    files = {"file": (os.path.basename(apk_path), f, "application/octet-stream")}
                    upload_res = await client.post(
                        f"{self.base_url}/api/v1/upload",
                        files=files,
                        headers=self.headers
                    )

                if upload_res.status_code != 200:
                    logger.warning(f"MobSF upload returned {upload_res.status_code}")
                    return {"status": "unavailable", "static_risk": None, "error": f"Upload HTTP {upload_res.status_code}"}

                upload_data = upload_res.json()
                scan_hash = upload_data.get("hash")
                if not scan_hash:
                    return {"status": "unavailable", "static_risk": None, "error": "No hash returned from MobSF upload"}

                # 2. Trigger Scan
                scan_res = await client.post(
                    f"{self.base_url}/api/v1/scan",
                    data={"hash": scan_hash},
                    headers=self.headers
                )
                if scan_res.status_code != 200:
                    logger.warning(f"MobSF scan returned {scan_res.status_code}")

                # 3. Retrieve Report
                report_res = await client.post(
                    f"{self.base_url}/api/v1/report_json",
                    data={"hash": scan_hash},
                    headers=self.headers
                )

                if report_res.status_code == 200:
                    report = report_res.json()
                    # MobSF 4.x keeps the score under "appsec"; older builds at top level.
                    # Verify against one real report_json from YOUR MobSF version.
                    raw_score = (report.get("appsec") or {}).get("security_score")
                    if raw_score is None:
                        raw_score = report.get("security_score")
                    try:
                        security_score = float(raw_score)
                    except (ValueError, TypeError):
                        # Old code defaulted to 60 here, which silently invented a score.
                        logger.warning("MobSF report has no security_score; skipping static component")
                        return {"status": "unavailable", "static_risk": None,
                                "error": "security_score not found in MobSF report", "hash": scan_hash}

                    # In MobSF 100 = best security. In PrivacyGuard 100 = highest risk.
                    static_risk = max(0.0, min(100.0, 100.0 - security_score))

                    trackers_info = report.get("trackers", {})
                    trackers_list = []
                    if isinstance(trackers_info, dict):
                        trackers_list = trackers_info.get("trackers", [])
                    elif isinstance(trackers_info, list):
                        trackers_list = trackers_info

                    findings = _extract_findings(report)
                    top_findings = [
                        f"MobSF [{f['severity']}]: {f['title']}" for f in findings[:4]
                    ]

                    return {
                        "status": "complete",
                        "security_score": security_score,
                        "static_risk": round(static_risk, 2),
                        "trackers": trackers_list,
                        "findings_count": len(findings),
                        "top_findings": top_findings,
                        "hash": scan_hash
                    }

                return {"status": "unavailable", "static_risk": None, "error": f"Report HTTP {report_res.status_code}"}

        except httpx.ConnectError:
            logger.info("MobSF daemon not reachable on configured URL; proceeding with renormalized dual engine.")
            return {"status": "unavailable", "static_risk": None, "error": "MobSF daemon offline or unreachable"}
        except Exception as e:
            logger.warning(f"MobSF analysis error: {str(e)}")
            return {"status": "failed", "static_risk": None, "error": str(e)}
