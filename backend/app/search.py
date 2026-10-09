import re
import urllib.parse
from typing import Any, Dict, List, Optional
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import or_
from loguru import logger

from .models_db import App, Scan

async def search_apps(
    query: str,
    db: Session
) -> List[Dict[str, Any]]:
    clean_q = query.strip()
    if not clean_q:
        return []

    results: List[Dict[str, Any]] = []
    seen_packages = set()

    # 1. Search database for stored audits
    app_rows = (
        db.query(App)
        .filter(
            or_(
                App.app_name.ilike(f"%{clean_q}%"),
                App.package_name.ilike(f"%{clean_q}%")
            )
        )
        .limit(10)
        .all()
    )

    for app_row in app_rows:
        if app_row.package_name in seen_packages:
            continue
        seen_packages.add(app_row.package_name)

        scan_row = (
            db.query(Scan)
            .filter(Scan.app_id == app_row.id)
            .order_by(Scan.created_at.desc())
            .first()
        )

        has_audit = scan_row is not None
        results.append({
            "package_name": app_row.package_name,
            "app_name": app_row.app_name,
            "version_name": app_row.version_name,
            "developer": "Verified On-Device Package",
            "icon_url": None,
            "audited": has_audit,
            "score": scan_row.final_score if has_audit else None,
            "severity": scan_row.severity if has_audit else None,
            "scan_id": scan_row.id if has_audit else None,
            "source": "Local PrivacyGuard Audits",
            "message": "Full explainable report available." if has_audit else "Not scanned yet. Upload APK to audit."
        })

    # 2. Query Google Play Store public web search for live store metadata
    try:
        encoded_q = urllib.parse.quote(clean_q)
        url = f"https://play.google.com/store/search?q={encoded_q}&c=apps&hl=en"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                html = resp.text
                matches = re.findall(r'/store/apps/details\?id=([a-zA-Z0-9_\.]+)', html)
                for pkg in matches:
                    if pkg in seen_packages or "google" in pkg and len(results) > 6:
                        continue
                    seen_packages.add(pkg)

                    parts = pkg.split(".")
                    short_name = parts[-1].replace("_", " ").title() if parts else pkg

                    results.append({
                        "package_name": pkg,
                        "app_name": short_name,
                        "version_name": "Latest Store Release",
                        "developer": "Google Play Store Listing",
                        "icon_url": None,
                        "audited": False,
                        "score": None,
                        "severity": None,
                        "scan_id": None,
                        "source": "Google Play Store",
                        "message": "Not scanned yet. Upload base APK or install the Android app to run static analysis."
                    })

                    if len(results) >= 12:
                        break
    except Exception as e:
        logger.debug(f"External Play Store search query skipped: {str(e)}")

    return results
