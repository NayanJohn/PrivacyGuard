import io
import json
import zipfile
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.store import delete_record

client = TestClient(app)

FORBIDDEN_WORDS = ["malware", "dangerous", "malicious"]

def check_no_forbidden(data: dict):
    def scan(item, path=""):
        if isinstance(item, str):
            for word in FORBIDDEN_WORDS:
                assert word not in item.lower(), f"Forbidden word '{word}' found in {path}: {item}"
        elif isinstance(item, list):
            for i, elem in enumerate(item):
                scan(elem, f"{path}[{i}]")
        elif isinstance(item, dict):
            for k, v in item.items():
                scan(v, f"{path}.{k}")
    scan(data)

def get_or_create_fixture_apk() -> bytes:
    fixture_path = Path(__file__).resolve().parent / "fixtures" / "fixture_app.apk"
    if fixture_path.exists():
        return fixture_path.read_bytes()

    # Try copying manifest from base.apk if available
    base_apk = Path("X:/hackbios/base.apk")
    if base_apk.exists():
        with zipfile.ZipFile(base_apk, "r") as src:
            manifest_bytes = src.read("AndroidManifest.xml")
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as dst:
            dst.writestr("AndroidManifest.xml", manifest_bytes)
        fixture_path.parent.mkdir(parents=True, exist_ok=True)
        fixture_bytes = buf.getvalue()
        fixture_path.write_bytes(fixture_bytes)
        return fixture_bytes

    return b""

def test_api_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("ok", "healthy")

def test_api_demo_notes_endpoint():
    res = client.get("/api/audits/demo-notes")
    assert res.status_code == 200
    data = res.json()
    assert data["audit_id"] == "demo-notes"
    assert data["status"] == "complete"
    assert data["category"] == "Notes"
    assert 0 <= data["score"] <= 100
    assert len(data["components"]) >= 3
    check_no_forbidden(data)

def test_api_non_apk_upload_fails_safely():
    # Frontend's demo blob upload or invalid file safely fails
    blob = io.BytesIO(b"PrivacyGuard-Mock-APK-Content")
    res = client.post(
        "/api/audits/apk",
        files={"apk": ("DemoNotes.apk", blob, "application/vnd.android.package-archive")},
        data={"claim": "A clean notes app", "category": "Notes"}
    )
    # Rejection with 400 Bad Request or processed failure status
    assert res.status_code in (200, 400)
    if res.status_code == 200:
        resp_data = res.json()
        assert resp_data["status"] in ("queued", "processing", "failed")
        audit_id = resp_data["audit_id"]

        # Poll status
        poll_res = client.get(f"/api/audits/{audit_id}")
        assert poll_res.status_code == 200
        poll_data = poll_res.json()
        assert poll_data["status"] == "failed"
        assert poll_data["error"] is not None
        check_no_forbidden(poll_data)

def test_api_full_audit_lifecycle():
    apk_bytes = get_or_create_fixture_apk()
    if not apk_bytes:
        import pytest
        pytest.skip("No fixture APK available for full lifecycle test.")

    # 1. POST /api/audits/apk
    file_obj = io.BytesIO(apk_bytes)
    create_res = client.post(
        "/api/audits/apk",
        files={"apk": ("TestApp.apk", file_obj, "application/vnd.android.package-archive")},
        data={"claim": "A video streaming player app", "category": "Entertainment"}
    )
    assert create_res.status_code == 200
    create_data = create_res.json()
    assert "audit_id" in create_data
    assert create_data["status"] in ("queued", "processing", "complete")
    audit_id = create_data["audit_id"]

    # 2. GET /api/audits/{audit_id} - poll until complete
    get_res = client.get(f"/api/audits/{audit_id}")
    assert get_res.status_code == 200
    audit_data = get_res.json()
    assert audit_data["status"] == "complete"
    assert audit_data["stage"] == "Complete"
    assert audit_data["error"] is None
    assert isinstance(audit_data["score"], int)
    assert len(audit_data["components"]) >= 3
    check_no_forbidden(audit_data)

    # 3. POST /api/audits/{audit_id}/reclassify
    reclass_res = client.post(
        f"/api/audits/{audit_id}/reclassify",
        json={"category": "Utilities & Tools"}
    )
    assert reclass_res.status_code == 200
    reclass_data = reclass_res.json()
    assert reclass_data["category"] == "Utilities & Tools"
    assert reclass_data["category_source"] == "user"
    assert len(reclass_data["components"]) >= 3
    check_no_forbidden(reclass_data)

    # 4. DELETE /api/audits/{audit_id}
    del_res = client.delete(f"/api/audits/{audit_id}")
    assert del_res.status_code == 200
    assert del_res.json().get("success") is True

    # 5. GET /api/audits/{audit_id} -> 404
    after_del = client.get(f"/api/audits/{audit_id}")
    assert after_del.status_code == 404
