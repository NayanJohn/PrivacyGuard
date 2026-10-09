import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from loguru import logger
from .config import SMTP_USER, SMTP_APP_PASSWORD, SMTP_HOST, SMTP_PORT, SITE_URL

def render_html_alert(
    child_name: str,
    app_name: str,
    package_name: str,
    score: int,
    severity: str,
    top_factors: List[str],
    risky_permissions: List[str],
    recommendations: List[str],
    portal_url: str
) -> str:
    color_map = {
        "low": "#10B981",
        "medium": "#3B82F6",
        "high": "#F59E0B",
        "critical": "#EF4444"
    }
    badge_color = color_map.get(severity.lower(), "#EF4444")

    factors_html = "".join([f"<li style='margin-bottom: 8px;'>{f}</li>" for f in top_factors])
    perms_html = "".join([f"<li style='margin-bottom: 6px;'><code>{p}</code></li>" for p in risky_permissions])
    recs_html = "".join([f"<li style='margin-bottom: 6px;'>{r}</li>" for r in recommendations])

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PrivacyGuard Safety Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 24px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <div style="background-color: #1e293b; padding: 20px 24px; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between;">
      <h2 style="margin: 0; color: #38bdf8; font-size: 20px;">🛡️ PrivacyGuard Parental Alert</h2>
      <span style="background-color: {badge_color}; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 12px; text-transform: uppercase;">
        {severity} RISK ({score}/100)
      </span>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
        Hello, <strong>{child_name}</strong> just scanned or installed an application on their Android device that exceeds safety thresholds:
      </p>
      
      <div style="background-color: #1e293b; border-left: 4px solid {badge_color}; padding: 14px 18px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin: 0 0 6px 0; color: #ffffff; font-size: 17px;">{app_name}</h3>
        <p style="margin: 0; color: #94a3b8; font-size: 13px; font-family: monospace;">{package_name}</p>
        <p style="margin: 10px 0 0 0; color: #f8fafc; font-size: 14px;">
          Overall Privacy Risk Score: <strong>{score} / 100</strong>
        </p>
      </div>

      <h4 style="color: #38bdf8; margin: 20px 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Key Risk Factors Identified</h4>
      <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.5; padding-left: 20px;">
        {factors_html}
      </ul>

      {f'''
      <h4 style="color: #f59e0b; margin: 20px 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">High-Risk Permissions</h4>
      <ul style="color: #cbd5e1; font-size: 13px; line-height: 1.5; padding-left: 20px;">
        {perms_html}
      </ul>
      ''' if perms_html else ''}

      <h4 style="color: #10b981; margin: 20px 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Recommended Actions</h4>
      <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.5; padding-left: 20px;">
        {recs_html}
      </ul>

      <div style="text-align: center; margin: 30px 0 16px 0;">
        <a href="{portal_url}" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 15px;">
          View Full Interactive Report in Parent Portal →
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 24px; border-top: 1px solid #1f2937; padding-top: 16px;">
        PrivacyGuard respects student and child privacy. We do NOT collect or share message text, photos, browsing history, or camera recordings. This alert covers declared and runtime permission boundaries only.
      </p>
    </div>
  </div>
</body>
</html>"""

def render_text_alert(
    child_name: str,
    app_name: str,
    package_name: str,
    score: int,
    severity: str,
    top_factors: List[str],
    portal_url: str
) -> str:
    factors = "\n".join([f"- {f}" for f in top_factors])
    return f"""PrivacyGuard Safety Alert

Hello,
{child_name} just installed or audited an application with an elevated risk score:

App Name: {app_name}
Package: {package_name}
Risk Score: {score} / 100 ({severity.upper()})

Key Factors:
{factors}

Review the full audit report on the PrivacyGuard Parent Portal:
{portal_url}

Note: PrivacyGuard does not collect message contents, photos, or browsing history.
"""

async def send_parent_email(
    recipient: str,
    subject: str,
    html_body: str,
    text_body: str
) -> Dict[str, Any]:
    """
    Sends email via Gmail SMTP with retry backoff.
    If credentials are not supplied, logs a simulated send cleanly.
    """
    if not SMTP_USER or not SMTP_APP_PASSWORD:
        logger.info(f"[Mailer Dry-Run] Email to {recipient}: {subject}")
        return {
            "status": "simulated",
            "attempts": 1,
            "error": None
        }

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"PrivacyGuard Security <{SMTP_USER}>"
    msg["To"] = recipient

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    attempts = 0
    max_retries = 3
    last_err = None

    while attempts < max_retries:
        attempts += 1
        try:
            # Run blocking SMTP in executor
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, _send_smtp_sync, recipient, msg)
            logger.info(f"Successfully sent alert email to {recipient} on attempt {attempts}")
            return {
                "status": "sent",
                "attempts": attempts,
                "error": None
            }
        except Exception as e:
            last_err = str(e)
            logger.warning(f"Failed to send email to {recipient} (attempt {attempts}): {last_err}")
            if attempts < max_retries:
                await asyncio.sleep(2 ** attempts)

    return {
        "status": "failed",
        "attempts": attempts,
        "error": last_err
    }

def _send_smtp_sync(recipient: str, msg: MIMEMultipart):
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_APP_PASSWORD)
        server.send_message(msg)
