import os
import httpx
from typing import Any, Dict, Optional
from loguru import logger
from .config import MOBSF_URL, MOBSF_API_KEY

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
            async with httpx.AsyncClient(timeout=60.0) as client:
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
                    security_score = report.get("security_score", 60)
                    try:
                        security_score = float(security_score)
                    except (ValueError, TypeError):
                        security_score = 60.0

                    # DIRECTION VERIFIED: In MobSF, 100 = best security score.
                    # In PrivacyGuard, 100 = highest risk.
                    # static_risk = 100 - mobsf_security_score
                    static_risk = max(0.0, min(100.0, 100.0 - security_score))

                    trackers_info = report.get("trackers", {})
                    trackers_list = []
                    if isinstance(trackers_info, dict):
                        trackers_list = trackers_info.get("trackers", [])
                    elif isinstance(trackers_info, list):
                        trackers_list = trackers_info

                    return {
                        "status": "complete",
                        "security_score": security_score,
                        "static_risk": round(static_risk, 2),
                        "trackers": trackers_list,
                        "findings_count": len(report.get("manifest_analysis", [])),
                        "hash": scan_hash
                    }

                return {"status": "unavailable", "static_risk": None, "error": f"Report HTTP {report_res.status_code}"}

        except httpx.ConnectError:
            logger.info("MobSF daemon not reachable on configured URL; proceeding with renormalized dual engine.")
            return {"status": "unavailable", "static_risk": None, "error": "MobSF daemon offline or unreachable"}
        except Exception as e:
            logger.warning(f"MobSF analysis error: {str(e)}")
            return {"status": "failed", "static_risk": None, "error": str(e)}
