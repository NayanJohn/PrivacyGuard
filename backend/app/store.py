import json
from datetime import datetime, timezone, timedelta
from typing import Optional
from pathlib import Path
from .models import AuditRecord, AuditResultOut, AuditInput
from .scoring import calculate_score
from .adapter import adapt_to_frontend_result

_RECORDS: dict[str, AuditRecord] = {}

def purge_expired() -> None:
    now = datetime.now(timezone.utc)
    expired_ids = []
    for aid, rec in _RECORDS.items():
        if aid == "demo-notes":
            continue  # Keep demo report available
        try:
            exp = datetime.fromisoformat(rec.expires_at)
            if exp < now:
                expired_ids.append(aid)
        except Exception:
            pass

    for aid in expired_ids:
        _RECORDS.pop(aid, None)

def get_record(audit_id: str) -> Optional[AuditRecord]:
    purge_expired()
    rec = _RECORDS.get(audit_id)
    if rec is None and audit_id == "demo-notes":
        init_demo_notes()
        rec = _RECORDS.get("demo-notes")
    return rec

def save_record(record: AuditRecord) -> None:
    purge_expired()
    _RECORDS[record.audit_id] = record

def delete_record(audit_id: str) -> bool:
    purge_expired()
    if audit_id in _RECORDS:
        del _RECORDS[audit_id]
        return True
    return False

def init_demo_notes() -> None:
    if "demo-notes" in _RECORDS:
        return

    sample_path = Path(__file__).resolve().parent.parent / "sample" / "sample_audit.json"
    if not sample_path.exists():
        return

    try:
        with open(sample_path, "r", encoding="utf-8") as f:
            raw = json.load(f)

        audit_input = AuditInput(**raw)
        engine_result = calculate_score(audit_input)

        now = datetime.now(timezone.utc)
        created_at = now.isoformat()
        expires_at = (now + timedelta(days=7)).isoformat()

        facts = {
            "app_name": audit_input.app_name,
            "package_name": audit_input.package_name,
            "version_name": "2.4.1 (Build 142)",
            "min_sdk": audit_input.security.min_sdk or 24,
            "target_sdk": audit_input.security.target_sdk or 32,
            "apk_sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
            "permissions": [p.permission for p in audit_input.permissions],
            "activities": ["MainActivity"],
            "services": [],
            "receivers": ["BootReceiver"],
            "providers": [],
            "exported_components": audit_input.security.exported_components,
            "dangerous_exported_components": audit_input.security.dangerous_exported_components,
            "debuggable": audit_input.security.debuggable,
            "cleartext_traffic": audit_input.security.cleartext_traffic,
            "dex_classes": [
                "com.example.demonotes.MainActivity",
                "com.example.demonotes.PhotoCaptureHelper",
                "com.example.demonotes.AudioRecordManager",
                "com.example.demonotes.LocationTelemetryProvider",
            ],
            "sample_size": 4280,
        }

        adapted = adapt_to_frontend_result(
            audit_id="demo-notes",
            status="complete",
            stage="Complete",
            error=None,
            created_at=created_at,
            expires_at=expires_at,
            claim=audit_input.claim,
            category_label="Notes",
            category_slug="note-taking",
            category_source="user",
            engine_result=engine_result,
            audit_input=audit_input,
            facts=facts,
        )

        record = AuditRecord(
            audit_id="demo-notes",
            status="complete",
            stage="Complete",
            error=None,
            created_at=created_at,
            expires_at=expires_at,
            claim=audit_input.claim,
            category_input="Notes",
            facts=facts,
            result=adapted,
        )
        _RECORDS["demo-notes"] = record
    except Exception as e:
        pass

# Initialize demo report on module import
init_demo_notes()
