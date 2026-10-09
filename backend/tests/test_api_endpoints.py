import os
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
DEMO_APK = os.path.join(os.path.dirname(__file__), "..", "fixtures", "demo_notes.apk")

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "androguard" in data
    assert "ml_model" in data

def test_app_search_endpoint():
    res = client.get("/apps/search?q=Notes")
    assert res.status_code == 200
    data = res.json()
    assert "apps" in data

def test_user_onboard_and_parent_link_flow():
    # Minor user onboard
    onboard_res = client.post("/users/onboard", json={
        "display_name": "Alice Minor",
        "age_category": "Below 18",
        "dob": "2010-05-15"
    })
    assert onboard_res.status_code == 200
    user_data = onboard_res.json()
    assert user_data["requires_parent_link"] is True
    user_id = user_data["user_id"]

    # Link parent
    link_res = client.post("/parent/link", json={
        "user_id": user_id,
        "parent_email": "parent.alice@example.com"
    })
    assert link_res.status_code == 200
    link_data = link_res.json()
    assert link_data["status"] == "code_sent"
    code = link_data["verification_code_demo"]
    token = link_data["magic_token"]

    # Verify parent
    verify_res = client.post("/parent/verify", json={
        "verification_code": code,
        "magic_token": token
    })
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "verified"

    # Access parent portal
    portal_res = client.get(f"/parent/portal/{token}")
    assert portal_res.status_code == 200
    portal_data = portal_res.json()
    assert portal_data["child_name"] == "Alice Minor"

def test_device_registration_and_event_batch():
    reg_res = client.post("/devices/register", json={
        "model": "Pixel 8 Pro",
        "android_version": "14"
    })
    assert reg_res.status_code == 200
    dev_id = reg_res.json()["device_id"]

    # Batch events
    events_res = client.post(f"/devices/{dev_id}/events", json={
        "permission_events": [
            {
                "package_name": "com.test.notes",
                "permission": "android.permission.RECORD_AUDIO",
                "state": "observed",
                "fg_bg": "foreground"
            }
        ],
        "usage_events": [
            {
                "package_name": "com.test.notes",
                "event_type": "resumed"
            }
        ],
        "network_stats": [
            {
                "package_name": "com.test.notes",
                "fg_bytes": 1024,
                "bg_bytes": 0
            }
        ]
    })
    assert events_res.status_code == 200
    assert events_res.json()["ingested_permission_events"] == 1

def test_analyze_apk_end_to_end():
    assert os.path.exists(DEMO_APK)
    with open(DEMO_APK, "rb") as f:
        res = client.post(
            "/analyze",
            files={"file": ("demo_notes.apk", f, "application/vnd.android.package-archive")},
            data={"claim": "A simple offline text notes organizer", "category": "Notes"}
        )
    assert res.status_code == 200
    data = res.json()
    assert "audit_id" in data
    audit_id = data["audit_id"]

    # Poll analyze endpoint
    poll_res = client.get(f"/analyze/{audit_id}")
    assert poll_res.status_code == 200
    poll_data = poll_res.json()
    assert poll_data["audit_id"] == audit_id
    assert 0 <= poll_data["score"] < 50
    assert poll_data["app"]["package_name"] == "com.privacyguard.demonotes"
    assert len(poll_data["components"]) >= 3
    assert len(poll_data["findings"]) >= 4

    # Compatible alias endpoint /api/audits/{id}
    compat_res = client.get(f"/api/audits/{audit_id}")
    assert compat_res.status_code == 200
    assert compat_res.json()["score"] == poll_data["score"]
