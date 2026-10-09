import json
from app.models import AuditInput, PermissionFinding, TrackerFinding
from app.scoring import calculate_score, band_for

def test_empty_permissions_no_exception():
    data = {
        "app_name": "EmptyPermApp",
        "package_name": "com.example.empty",
        "category": "utilities",
        "claim": "A simple calculator with no special permissions.",
        "permissions": [],
    }
    audit = AuditInput(**data)
    result = calculate_score(audit)
    assert 0 <= result["risk_score"] <= 100
    assert 0 <= result["confidence"] <= 100

def test_score_is_dynamic():
    data = json.load(open("sample/sample_audit.json"))
    result1 = calculate_score(AuditInput(**data))
    data["permissions"][3]["claim_relation"] = "relevant"
    result2 = calculate_score(AuditInput(**data))
    assert result1["risk_score"] != result2["risk_score"]
    assert result2["risk_score"] < result1["risk_score"]

def test_score_range():
    data = json.load(open("sample/sample_audit.json"))
    result = calculate_score(AuditInput(**data))
    assert 0 <= result["risk_score"] <= 100
    assert 0 <= result["confidence"] <= 100

def test_band_boundaries():
    assert "Low" in band_for(20)
    assert "Moderate" in band_for(21)
    assert "Moderate" in band_for(45)
    assert "Elevated" in band_for(46)
    assert "Elevated" in band_for(70)
    assert band_for(71) == "High Concern (Requires Review)"
    assert "High" in band_for(100)

def test_not_verified_adds_zero_risk_and_lowers_confidence():
    base_data = {
        "app_name": "TestApp",
        "package_name": "com.test",
        "category": "utilities",
        "claim": "Testing app",
        "permissions": [
            PermissionFinding(
                permission="android.permission.CAMERA",
                sensitivity=70,
                claim_relation="unrelated",
                evidence="Observed",
                reason="Camera not justified"
            )
        ]
    }
    audit_observed = AuditInput(**base_data)
    res_observed = calculate_score(audit_observed)

    # Change to Not Verified
    unverified_data = dict(base_data)
    unverified_data["permissions"] = [
        PermissionFinding(
            permission="android.permission.CAMERA",
            sensitivity=70,
            claim_relation="unrelated",
            evidence="Not Verified",
            reason="Camera unverified"
        )
    ]
    audit_unverified = AuditInput(**unverified_data)
    res_unverified = calculate_score(audit_unverified)

    # Not Verified should have strictly lower risk score (0 mismatch points) than Observed
    assert res_unverified["risk_score"] <= res_observed["risk_score"]
    # And confidence should be lower
    assert res_unverified["confidence"] < res_observed["confidence"]
