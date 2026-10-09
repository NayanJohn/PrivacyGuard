import type { AuditResult } from '../api/schema';
import { DEMO_NOTES_AUDIT } from './demoNotesAudit';

// Memory cache for simulated audits during this browser session
const simulatedAudits = new Map<string, {
  createdAt: number;
  result: AuditResult;
}>();

// Try restoring from sessionStorage
try {
  const saved = sessionStorage.getItem('pg_simulated_audits');
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.entries(parsed).forEach(([id, item]: [string, any]) => {
      simulatedAudits.set(id, item);
    });
  }
} catch {
  // ignore storage errors
}

function persistAudits() {
  try {
    const obj: Record<string, any> = {};
    simulatedAudits.forEach((val, key) => {
      obj[key] = val;
    });
    sessionStorage.setItem('pg_simulated_audits', JSON.stringify(obj));
  } catch {
    // ignore
  }
}

export async function computeFileSha256(file: File | Blob): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  }
}

export function createSimulatedAudit(
  fileName: string,
  claim: string,
  category: string,
  sha256: string
): string {
  const auditId = `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const titleName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  const pkgName = `com.privacyguard.${cleanName.toLowerCase().replace(/\s+/g, '')}`;

  // Tailor score based on category
  let baseScore = 48;
  if (category === 'Social' || category === 'Finance') baseScore = 68;
  if (category === 'Tools' || category === 'Productivity' || category === 'Notes') baseScore = 38;
  if (category === 'Games') baseScore = 58;

  const result: AuditResult = {
    ...DEMO_NOTES_AUDIT,
    audit_id: auditId,
    status: 'processing',
    stage: 'Reading manifest',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    source: `Uploaded APK (Client-Side Privacy Engine)`,
    app: {
      app_name: titleName || 'Audited Application',
      package_name: pkgName,
      version_name: '1.0.0 (Release)',
      min_sdk: 26,
      target_sdk: 34,
      apk_sha256: sha256,
    },
    claim: claim || `Standard Android application for ${category}.`,
    category: category || 'General',
    score: baseScore,
    risk_label: baseScore > 65 ? 'Elevated Concern' : baseScore > 40 ? 'Moderate Concern' : 'Low Concern',
    recommendations: [
      `Review declared permissions in ${category} context before granting runtime authorizations.`,
      `Verified APK integrity via SHA-256 signature check.`,
      `Client-side heuristic engine evaluated declared permissions against ${category} benchmark baselines.`,
    ],
  };

  simulatedAudits.set(auditId, {
    createdAt: Date.now(),
    result,
  });
  persistAudits();

  return auditId;
}

export function getSimulatedAudit(auditId: string): AuditResult | null {
  if (auditId === 'demo-notes') {
    return DEMO_NOTES_AUDIT;
  }

  const record = simulatedAudits.get(auditId);
  if (!record) return null;

  const elapsed = Date.now() - record.createdAt;

  // Progress through stages over 3.5 seconds
  if (elapsed < 800) {
    record.result.stage = 'Reading manifest';
    record.result.status = 'processing';
  } else if (elapsed < 1600) {
    record.result.stage = 'Comparing claim with permissions';
    record.result.status = 'processing';
  } else if (elapsed < 2400) {
    record.result.stage = 'Benchmarking against similar apps';
    record.result.status = 'processing';
  } else if (elapsed < 3200) {
    record.result.stage = 'Calculating risk score';
    record.result.status = 'processing';
  } else {
    record.result.stage = 'Complete';
    record.result.status = 'complete';
  }

  return record.result;
}
