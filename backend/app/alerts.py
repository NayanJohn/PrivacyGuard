from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from loguru import logger

from .models_db import User, Alert, ParentLink, EmailLog, Scan
from .config import PARENT_ALERT_THRESHOLD, SITE_URL
from .mailer import render_html_alert, render_text_alert, send_parent_email

async def process_scan_alerts(
    db: Session,
    scan: Scan,
    user: Optional[User],
    app_meta: Dict[str, Any],
    combine_result: Dict[str, Any]
) -> Optional[Alert]:
    """
    Checks alert triggers for newly audited scans.
    Rule: When an audit completes for an under-18 user and score >= 80,
    the backend sends an email alert to the verified parent Gmail address.
    Deduplicates per app version.
    """
    score = combine_result.get("final_score", 0)
    severity = combine_result.get("severity", "low")
    app_name = app_meta.get("app_name", "Android App")
    package_name = app_meta.get("package_name", "unknown.package")

    # If score is below threshold, no alert needed
    if score < PARENT_ALERT_THRESHOLD:
        return None

    is_minor = user and user.age_category == "minor"

    # In-app Alert record
    alert_title = f"High Risk Detected: {app_name} ({score}/100)"
    alert_msg = (
        f"Audit score of {score}/100 exceeds privacy safety limit. "
        f"Top factor: {combine_result.get('top_factors', ['Multiple sensitive permissions'])[0]}"
    )

    alert = Alert(
        user_id=user.id if user else None,
        device_id=scan.device_id,
        scan_id=scan.id,
        app_name=app_name,
        package_name=package_name,
        score=score,
        severity=severity,
        title=alert_title,
        message=alert_msg,
        kind="high_risk_app",
    )
    db.add(alert)
    db.flush()

    # If under 18, dispatch email to verified parent
    if is_minor:
        parent_link = (
            db.query(ParentLink)
            .filter(
                and_(
                    ParentLink.user_id == user.id,
                    ParentLink.verified_at.is_not(None)
                )
            )
            .first()
        )

        if parent_link:
            # Deduplication check
            existing_email = (
                db.query(EmailLog)
                .join(Alert)
                .filter(
                    and_(
                        Alert.user_id == user.id,
                        Alert.package_name == package_name,
                        EmailLog.recipient == parent_link.parent_email,
                        EmailLog.status.in_(["sent", "simulated"])
                    )
                )
                .first()
            )

            if not existing_email:
                portal_url = f"{SITE_URL}/parent/portal/{parent_link.magic_token}"
                risky_perms = [
                    p for p in app_meta.get("declared_permissions", [])
                    if any(k in p for k in ("AUDIO", "CAMERA", "LOCATION", "SMS", "CONTACTS"))
                ]

                html_content = render_html_alert(
                    child_name=user.display_name,
                    app_name=app_name,
                    package_name=package_name,
                    score=score,
                    severity=severity,
                    top_factors=combine_result.get("top_factors", []),
                    risky_permissions=risky_perms,
                    recommendations=combine_result.get("recommendations", []),
                    portal_url=portal_url
                )

                text_content = render_text_alert(
                    child_name=user.display_name,
                    app_name=app_name,
                    package_name=package_name,
                    score=score,
                    severity=severity,
                    top_factors=combine_result.get("top_factors", []),
                    portal_url=portal_url
                )

                subject = f"⚠️ PrivacyGuard Alert: High-risk app detected on {user.display_name}'s device"

                mail_res = await send_parent_email(
                    recipient=parent_link.parent_email,
                    subject=subject,
                    html_body=html_content,
                    text_body=text_content
                )

                email_log = EmailLog(
                    alert_id=alert.id,
                    recipient=parent_link.parent_email,
                    subject=subject,
                    status=mail_res["status"],
                    attempts=mail_res["attempts"],
                    error_message=mail_res.get("error")
                )
                db.add(email_log)
                db.flush()
                logger.info(f"Dispatched parent alert to {parent_link.parent_email} (status: {mail_res['status']})")

    return alert
