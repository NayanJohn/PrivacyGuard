import json
from datetime import datetime, timezone, timedelta
from app.models import AuditInput
from app.scoring import calculate_score
from app.adapter import adapt_to_frontend_result

EXPECTED_COMPONENTS = [
    ("Claim-to-Permission Divergence", 50),
    ("Peer Category Benchmark Deviation", 10),
    ("Sensitive Data Scope", 10),
    ("Third-Party SDK Surface", 10),
    ("Runtime Dynamic Behavior", 10),
    ("Source Verification", 5),
    ("Security Configuration", 5),
]

EXPECTED_KEYS = {
    "audit_id",
    "status",
    "stage",
    "error",
    "created_at",
    "expires_at",
    "source",
    "app",
    "claim",
    "category",
    "category_source",
    "score",
    "risk_label",
    "score_bands",
    "components",
    "findings",
    "benchmark_sample_size",
    "runtime_note",
    "recommendations",
}

def load_sample_adapted():
    with open("sample/sample_audit.json", "r", encoding="utf-8") as f:
        raw = json.load(f)

    audit_input = AuditInput(**raw)
    engine_result = calculate_score(audit_input)

    now = datetime.now(timezone.utc)
    created_at = now.isoformat()
    expires_at = (now + timedelta(days=7)).isoformat()

    facts = {
        "app_name": audit_input.app_name,
        "package_name": audit_input.package_name,
        "version_name": "2.4.1",
        "min_sdk": audit_input.security.min_sdk or 24,
        "target_sdk": audit_input.security.target_sdk or 32,
        "apk_sha256": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "permissions": [p.permission for p in audit_input.permissions],
        "activities": ["MainActivity"],
        "services": [],
        "receivers": [],
        "providers": [],
        "exported_components": audit_input.security.exported_components,
        "dangerous_exported_components": audit_input.security.dangerous_exported_components,
        "debuggable": audit_input.security.debuggable,
        "cleartext_traffic": audit_input.security.cleartext_traffic,
        "dex_classes": ["com.example.demonotes.PhotoCaptureHelper"],
        "sample_size": 4280,
    }

    adapted = adapt_to_frontend_result(
        audit_id="test-audit-123",
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
    return adapted

def test_adapter_components_order_and_weights():
    adapted = load_sample_adapted()
    data = adapted.model_dump()

    # Check components count and exact order and weights
    assert len(data["components"]) == 7
    total_weight = 0
    for idx, (expected_name, expected_weight) in enumerate(EXPECTED_COMPONENTS):
        comp = data["components"][idx]
        assert comp["name"] == expected_name
        assert comp["weight"] == expected_weight
        total_weight += comp["weight"]
        assert isinstance(comp["score"], (int, float))
        assert isinstance(comp["verified"], bool)
        assert isinstance(comp["reasons"], list)

    assert total_weight == 100

def test_adapter_keys_and_types():
    adapted = load_sample_adapted()
    data = adapted.model_dump()

    for k in EXPECTED_KEYS:
        assert k in data, f"Missing expected key: {k}"

    assert isinstance(data["score"], int)
    assert 0 <= data["score"] <= 100
    assert data["status"] in ("queued", "processing", "complete", "failed")
    assert data["source"] == "Uploaded APK"
    assert data["category_source"] in ("user", "auto_detected")
    assert isinstance(data["score_bands"], list)
    assert len(data["score_bands"]) == 4

def test_enum_translations():
    adapted = load_sample_adapted()
    data = adapted.model_dump()

    valid_relevance = {"required", "potentially_relevant", "suspicious", "not_justified"}
    valid_evidence = {"observed", "inferred", "not_verified"}

    for f in data["findings"]:
        # Verify enum translation
        assert f["relevance"] in valid_relevance, f"Untranslated relevance: {f['relevance']}"
        assert f["evidence_type"] in valid_evidence, f"Untranslated evidence: {f['evidence_type']}"
        # Verify no engine internal enums leak
        assert f["relevance"] not in ("relevant", "context", "unusual", "unrelated")
        assert f["evidence_type"] not in ("Observed", "Inferred", "Not Verified")

def test_no_forbidden_words_in_output():
    adapted = load_sample_adapted()
    data = adapted.model_dump()

    forbidden = ["malware", "dangerous", "malicious"]

    def check_recursive(item, path=""):
        if isinstance(item, str):
            for word in forbidden:
                assert word not in item.lower(), f"Forbidden word '{word}' found in {path}: {item}"
        elif isinstance(item, list):
            for i, elem in enumerate(item):
                check_recursive(elem, f"{path}[{i}]")
        elif isinstance(item, dict):
            for k, v in item.items():
                # Internal field dangerous_exported_components on SecurityMetadata is not in response,
                # but check all string values:
                check_recursive(v, f"{path}.{k}")

    check_recursive(data)
