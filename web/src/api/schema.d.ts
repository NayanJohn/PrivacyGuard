export type AuditStatus = 'queued' | 'processing' | 'complete' | 'failed';

export type AuditStage = 
  | 'Uploading'
  | 'Reading manifest'
  | 'Comparing claim with permissions'
  | 'Benchmarking against similar apps'
  | 'Calculating risk score'
  | 'Complete'
  | 'Failed';

export type RelevanceType = 'required' | 'potentially_relevant' | 'suspicious' | 'not_justified';
export type EvidenceType = 'observed' | 'inferred' | 'not_verified';

export interface AppMetadata {
  app_name: string;
  package_name: string;
  version_name: string;
  min_sdk: number;
  target_sdk: number;
  apk_sha256: string;
}

export interface ScoreBand {
  min: number;
  max: number;
  label: string;
  color: string;
  description: string;
}

export interface ScoreComponent {
  name: string;
  weight: number;
  score: number;
  description: string;
  verified: boolean;
  reasons: string[];
}

export interface Finding {
  id: string;
  permission: string;
  name: string;
  purpose: string;
  relevance: RelevanceType;
  benchmark_pct: number;
  evidence_type: EvidenceType;
  evidence_details: string;
  category_comparison: string;
}

export interface TrackerItem {
  name: string;
  signature?: string;
  evidence?: string;
}

export interface AuditResult {
  audit_id: string;
  status: AuditStatus;
  stage: string;
  error: string | null;
  created_at: string;
  expires_at: string;
  source: string;
  app: AppMetadata;
  claim: string;
  category: string;
  category_source: 'user' | 'auto_detected';
  score: number;
  risk_label: string;
  score_bands: ScoreBand[];
  components: ScoreComponent[];
  findings: Finding[];
  benchmark_sample_size: number;
  runtime_note: string;
  recommendations: string[];
  confidence?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  mobsf_status?: 'pending' | 'complete' | 'unavailable' | 'failed';
  top_factors?: string[];
  trackers?: TrackerItem[];
}

export interface AuditCreationResponse {
  audit_id: string;
  scan_id?: string;
  status: 'queued' | 'processing' | 'complete';
  stage: string;
}

export interface AlertItem {
  id: string;
  user_id?: string | null;
  device_id?: string | null;
  scan_id?: string | null;
  app_name: string;
  package_name: string;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  kind: string;
  created_at: string;
}

export interface SearchAppResult {
  package_name: string;
  app_name: string;
  version_name: string;
  developer: string;
  icon_url: string | null;
  audited: boolean;
  score: number | null;
  severity: string | null;
  scan_id: string | null;
  source: string;
  message: string;
}

export interface SearchResponse {
  query: string;
  count: number;
  apps: SearchAppResult[];
}

export interface ParentPortalData {
  child_name: string;
  parent_email: string;
  verified_at: string | null;
  consent_version: string;
  alerts: AlertItem[];
  reports: AuditResult[];
}

export interface HealthResponse {
  status: string;
  androguard: string;
  ml_model: string;
  mobsf: string;
  database: string;
  smtp: string;
  rules_version: string;
}
