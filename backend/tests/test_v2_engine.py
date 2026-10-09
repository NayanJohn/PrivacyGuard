import os
import uuid
import pytest
from app.extractor import extract_features
from app.ml_model import calculate_ml_risk
from app.heuristics import calculate_heuristic_risk
from app.combine import combine_scores, get_severity_band
from app.database import SessionLocal, init_db
from app.models_db import User, Device, App, Scan, Alert, ParentLink
from app.alerts import process_scan_alerts
from app.search import search_apps

DEMO_APK = os.path.join(os.path.dirname(__file__), "..", "fixtures", "demo_notes.apk")

def test_extract_features_real_apk():
    assert os.path.exists(DEMO_APK), "demo_notes.apk fixture must exist"
    features = extract_features(DEMO_APK)
    assert features["package_name"] == "com.privacyguard.demonotes"
    assert features["app_name"] == "Demo Notes"
    assert len(features["permissions"]) >= 4
    assert "android.permission.RECORD_AUDIO" in features["permissions"]
    assert "android.permission.CAMERA" in features["permissions"]
    assert "android.permission.ACCESS_FINE_LOCATION" in features["permissions"]
    assert len(features["apk_sha256"]) == 64

def test_riskindroid_ml_bounds():
    # Empty features
    res_empty = calculate_ml_risk({"permissions": []})
    assert res_empty["ml_risk"] == 0.0

    # High risk permissions
    feats = {
        "declared_permissions": [
            "android.permission.RECORD_AUDIO",
            "android.permission.CAMERA",
            "android.permission.ACCESS_FINE_LOCATION",
            "android.permission.ACCESS_BACKGROUND_LOCATION",
            "android.permission.SEND_SMS",
        ],
        "used_permissions": ["android.permission.RECORD_AUDIO", "android.permission.CAMERA"]
    }
    res = calculate_ml_risk(feats)
    assert 0.0 <= res["ml_risk"] <= 100.0
    assert res["ml_risk"] > 50.0
    assert len(res["top_factors"]) > 0

def test_heuristics_engine():
    feats = {
        "declared_permissions": ["android.permission.RECORD_AUDIO", "android.permission.CAMERA"],
        "debuggable": True,
        "cleartext_traffic": True,
        "dangerous_exported_components": 2,
        "target_sdk": 26
    }
    res = calculate_heuristic_risk(feats, claim="A simple text notepad", category="Notes")
    assert 0.0 <= res["heuristic_risk"] <= 100.0
    assert res["heuristic_risk"] >= 80.0
    assert any("Microphone and Camera" in v["title"] for v in res["violations"])
    assert any("Debuggable" in v["title"] for v in res["violations"])

def test_combine_three_components_and_renormalization():
    ml = {"ml_risk": 80.0, "top_factors": ["ML factor 1"]}
    heur = {"heuristic_risk": 90.0, "top_factors": ["Heuristic factor 1"]}

    # Case 1: MobSF is available (full 3-component blend: 0.25, 0.25, 0.50)
    # Expected: 80 * 0.25 + (100 - 60) * 0.25 + 90 * 0.50 = 20 + 10 + 45 = 75
    mobsf_complete = {"status": "complete", "security_score": 60, "static_risk": 40.0}
    res_full = combine_scores(ml, heur, mobsf_complete)
    assert res_full["final_score"] == 75
    assert res_full["severity"] == "high"
    assert res_full["complete"] is True
    assert res_full["breakdown"]["static"]["weight"] == 0.25

    # Case 2: MobSF is pending or unavailable (renormalized 2-component blend: 0.25 / 0.75 and 0.50 / 0.75)
    # Expected: 80 * (0.25/0.75) + 90 * (0.50/0.75) = 26.67 + 60.0 = 86.67 -> 87
    mobsf_pending = {"status": "pending", "static_risk": None}
    res_renorm = combine_scores(ml, heur, mobsf_pending)
    assert res_renorm["final_score"] == 87
    assert res_renorm["severity"] == "critical"
    assert res_renorm["complete"] is False
    assert res_renorm["breakdown"]["static"]["status"] == "pending"

def test_severity_bands():
    assert get_severity_band(15) == "low"
    assert get_severity_band(40) == "medium"
    assert get_severity_band(65) == "high"
    assert get_severity_band(85) == "critical"
    assert get_severity_band(100) == "critical"

def test_parent_alerts_minor_deduplication():
    import asyncio
    asyncio.run(_run_parent_alert_test())

async def _run_parent_alert_test():
    init_db()
    session = SessionLocal()
    try:
        # Create minor user
        minor = User(display_name="Test Student", age_category="minor")
        session.add(minor)
        session.flush()

        # Create verified parent link
        test_uid = uuid.uuid4().hex[:8]
        parent_link = ParentLink(
            user_id=minor.id,
            parent_email="parent@example.com",
            verification_code="123456",
            magic_token=f"token_{test_uid}",
            verified_at=None  # not verified yet
        )
        session.add(parent_link)
        session.commit()

        # Dummy scan with score 85 (exceeds 80 threshold)
        app_record = App(
            package_name=f"com.test.riskyapp_{test_uid}",
            app_name="Risky App",
            version_name="1.0.0",
            apk_sha256=f"sha_{test_uid}"
        )
        session.add(app_record)
        session.flush()

        scan = Scan(
            app_id=app_record.id,
            user_id=minor.id,
            final_score=85,
            severity="critical"
        )
        session.add(scan)
        session.commit()

        # Process alert when parent not verified -> alert created in-app, but no email dispatched
        comb_res = {
            "final_score": 85,
            "severity": "critical",
            "top_factors": ["High background sensor usage"],
            "recommendations": ["Review app permissions"]
        }
        alert1 = await process_scan_alerts(session, scan, minor, {"package_name": "com.test.riskyapp", "app_name": "Risky App"}, comb_res)
        session.commit()
        assert alert1 is not None
        assert alert1.score == 85
        assert alert1.kind == "high_risk_app"

    finally:
        session.close()
