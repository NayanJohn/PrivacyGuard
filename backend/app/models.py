from typing import Literal, Optional, Any
from pydantic import BaseModel, Field

# Internal scoring evidence types
EvidenceLabel = Literal["Observed", "Inferred", "Not Verified"]

class PermissionFinding(BaseModel):
    permission: str
    sensitivity: float
    claim_relation: Literal["relevant", "context", "unusual", "unrelated"]
    evidence: EvidenceLabel = "Observed"
    reason: str = ""

class RuntimeEvent(BaseModel):
    event_type: str
    severity: float = Field(ge=0, le=100)
    evidence: EvidenceLabel
    expected: bool = True
    description: str = ""

class TrackerFinding(BaseModel):
    name: str
    tracker_score: float = Field(ge=0, le=100)
    evidence: EvidenceLabel = "Observed"
    description: str = ""

class SecurityMetadata(BaseModel):
    target_sdk: Optional[int] = None
    min_sdk: Optional[int] = None
    exported_components: int = 0
    dangerous_exported_components: int = 0
    debuggable: bool = False
    cleartext_traffic: bool = False

class AuditInput(BaseModel):
    app_name: str
    package_name: str
    category: str
    claim: str
    permissions: list[PermissionFinding] = []
    runtime_events: list[RuntimeEvent] = []
    trackers: list[TrackerFinding] = []
    security: SecurityMetadata = SecurityMetadata()
    source_verified: Optional[bool] = None
    source_type: str = "unknown"
    privacy_indicators: list[float] = []
    benchmark_frequencies: dict[str, float] = {}

# Frontend API Models
AuditStatus = Literal["queued", "processing", "complete", "failed"]
RelevanceType = Literal["required", "potentially_relevant", "suspicious", "not_justified"]
FrontendEvidenceType = Literal["observed", "inferred", "not_verified"]

class AppMetadataOut(BaseModel):
    app_name: str
    package_name: str
    version_name: str
    min_sdk: int
    target_sdk: int
    apk_sha256: str

class ScoreBandOut(BaseModel):
    min: int
    max: int
    label: str
    color: str
    description: str

class ComponentOut(BaseModel):
    name: str
    weight: int
    score: float
    description: str
    verified: bool
    reasons: list[str]

class FindingOut(BaseModel):
    id: str
    permission: str
    name: str
    purpose: str
    relevance: RelevanceType
    benchmark_pct: float
    evidence_type: FrontendEvidenceType
    evidence_details: str
    category_comparison: str

class AuditResultOut(BaseModel):
    audit_id: str
    status: AuditStatus
    stage: str
    error: Optional[str] = None
    created_at: str
    expires_at: str
    source: str = "Uploaded APK"
    app: AppMetadataOut
    claim: str
    category: str
    category_source: Literal["user", "auto_detected"]
    score: int
    final_score: Optional[int] = None
    risk_label: str
    score_bands: list[ScoreBandOut]
    components: list[ComponentOut]
    findings: list[FindingOut]
    benchmark_sample_size: int
    runtime_note: str
    recommendations: list[str]
    confidence: Optional[float] = None
    # v2 Fields
    severity: Optional[str] = None
    mobsf_status: Optional[str] = None
    top_factors: Optional[list[str]] = None
    trackers: Optional[list[dict[str, Any]]] = None
    complete: Optional[bool] = None
    summary: Optional[str] = None
    breakdown: Optional[dict[str, Any]] = None
    verdict: Optional[str] = None
    app_profile: Optional[dict[str, Any]] = None
    mismatches: Optional[list[dict[str, Any]]] = None
    harmful_patterns: Optional[list[dict[str, Any]]] = None
    permission_audit: Optional[list[dict[str, Any]]] = None
    floor_applied: Optional[bool] = None

class AuditCreationResponse(BaseModel):
    audit_id: str
    status: Literal["queued", "processing", "complete"]
    stage: str
    scan_id: Optional[str] = None
    final_score: Optional[int] = None
    score: Optional[int] = None
    severity: Optional[str] = None
    risk_label: Optional[str] = None
    complete: Optional[bool] = None
    mobsf_status: Optional[str] = None
    breakdown: Optional[dict[str, Any]] = None
    top_factors: Optional[list[str]] = None
    trackers: Optional[list[dict[str, Any]]] = None
    recommendations: Optional[list[str]] = None
    summary: Optional[str] = None
    confidence: Optional[float] = None
    verdict: Optional[str] = None
    app_profile: Optional[dict[str, Any]] = None
    mismatches: Optional[list[dict[str, Any]]] = None
    harmful_patterns: Optional[list[dict[str, Any]]] = None
    permission_audit: Optional[list[dict[str, Any]]] = None
    floor_applied: Optional[bool] = None

class ReclassifyRequest(BaseModel):
    category: str

class AuditRecord(BaseModel):
    audit_id: str
    status: AuditStatus
    stage: str
    error: Optional[str] = None
    created_at: str
    expires_at: str
    claim: str
    category_input: str
    facts: dict[str, Any] = Field(default_factory=dict)
    result: Optional[AuditResultOut] = None

# v2 Endpoints Payloads
class UserOnboardRequest(BaseModel):
    display_name: str = "Android User"
    age_category: Literal["adult", "minor", "18 and above", "Below 18"]
    dob: Optional[str] = None

class UserOnboardResponse(BaseModel):
    user_id: str
    display_name: str
    age_category: str
    requires_parent_link: bool
    token: str

class ParentLinkRequest(BaseModel):
    user_id: Optional[str] = None
    parent_email: str

class ParentVerifyRequest(BaseModel):
    verification_code: str
    magic_token: Optional[str] = None
    parent_email: Optional[str] = None
    consent_accepted: bool = True

class AlertOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    device_id: Optional[str] = None
    scan_id: Optional[str] = None
    app_name: str
    package_name: str
    score: int
    severity: str
    title: str
    message: str
    kind: str
    created_at: str

class ParentPortalResponse(BaseModel):
    child_name: str
    parent_email: str
    verified_at: Optional[str]
    consent_version: str
    alerts: list[AlertOut]
    reports: list[dict[str, Any]]

class DeviceRegisterRequest(BaseModel):
    user_id: Optional[str] = None
    model: str = "Android Device"
    android_version: str = "14"

class DeviceRegisterResponse(BaseModel):
    device_id: str
    user_id: Optional[str]
    registered_at: str

class PermissionEventIn(BaseModel):
    package_name: str
    permission: str
    state: Literal["observed", "inferred", "declared"] = "declared"
    fg_bg: Literal["foreground", "background"] = "foreground"
    timestamp: Optional[str] = None

class UsageEventIn(BaseModel):
    package_name: str
    event_type: str  # resumed, paused, fg_service_start, fg_service_stop
    timestamp: Optional[str] = None

class NetworkStatIn(BaseModel):
    package_name: str
    fg_bytes: int = 0
    bg_bytes: int = 0
    window_start: Optional[str] = None

class DeviceEventsBatchRequest(BaseModel):
    permission_events: list[PermissionEventIn] = []
    usage_events: list[UsageEventIn] = []
    network_stats: list[NetworkStatIn] = []

class HealthStatusOut(BaseModel):
    status: str
    androguard: str
    ml_model: str
    mobsf: str
    database: str
    smtp: str
    rules_version: str
