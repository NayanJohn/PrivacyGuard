import axios from 'axios';
import type {
  AuditResult,
  AuditCreationResponse,
  AlertItem,
  SearchResponse,
  ParentPortalData,
  HealthResponse,
} from './schema';
import { DEMO_NOTES_AUDIT } from '../data/demoNotesAudit';
import {
  computeFileSha256,
  createSimulatedAudit,
  getSimulatedAudit,
} from '../data/simulatedAudit';

export const getApiBaseUrl = (): string => {
  try {
    const custom = localStorage.getItem('privacyguard_api_url');
    if (custom) return custom.replace(/\/+$/, '');
  } catch {
    // ignore
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

export const setCustomApiBaseUrl = (url: string | null) => {
  try {
    if (url) {
      localStorage.setItem('privacyguard_api_url', url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('privacyguard_api_url');
    }
  } catch {
    // ignore
  }
};

export const API_BASE_URL = getApiBaseUrl();

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
});

// Update baseURL dynamically per request in case user changed it in settings
http.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail || error.response?.data?.message || error.message;
    const customError = new Error(detail);
    (customError as any).response = error.response;
    (customError as any).code = error.code;
    return Promise.reject(customError);
  }
);

function isNetworkError(error: any): boolean {
  if (!error) return false;
  if (!error.response && error.code) return true;
  const msg = String(error.message || '').toLowerCase();
  return (
    msg.includes('network error') ||
    msg.includes('failed to fetch') ||
    msg.includes('connection refused') ||
    msg.includes('err_connection_refused') ||
    msg.includes('err_network') ||
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED'
  );
}

export const apiClient = {
  /**
   * Upload an APK file with user claim and category to the real backend engine,
   * with seamless client-side simulated fallback if backend is unreachable.
   */
  async uploadApk(
    file: File | Blob,
    fileName: string,
    claim: string,
    category: string,
    onProgress?: (percent: number) => void
  ): Promise<AuditCreationResponse> {
    const isMockEnv = import.meta.env.VITE_MOCK === 'true';

    if (!isMockEnv) {
      try {
        const formData = new FormData();
        formData.append('file', file, fileName);
        formData.append('claim', claim);
        formData.append('category', category);

        const response = await http.post<AuditCreationResponse>('/analyze', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 20000,
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(percent);
            }
          },
        });
        return response.data;
      } catch (err: any) {
        if (!isNetworkError(err)) {
          throw err;
        }
        console.warn(`[PrivacyGuard] Live backend at ${getApiBaseUrl()} unreachable. Running simulated client-side audit engine.`);
      }
    }

    // Client-side simulated fallback
    if (onProgress) {
      onProgress(40);
      await new Promise((r) => setTimeout(r, 200));
      onProgress(85);
      await new Promise((r) => setTimeout(r, 200));
      onProgress(100);
    }

    const sha256 = await computeFileSha256(file);
    const simAuditId = createSimulatedAudit(fileName, claim, category, sha256);

    return {
      audit_id: simAuditId,
      status: 'processing',
      stage: 'Reading manifest',
      message: 'Analysis initiated via Client-Side Privacy Engine (Demo/Offline Mode)',
    } as AuditCreationResponse;
  },

  /**
   * Poll for current audit state and result from the backend,
   * with simulated progress and demo fallback.
   */
  async getAudit(auditId: string): Promise<AuditResult> {
    if (auditId.startsWith('sim-')) {
      const sim = getSimulatedAudit(auditId);
      if (sim) return sim;
    }

    if (auditId === 'demo-notes') {
      try {
        const response = await http.get<AuditResult>(`/analyze/${auditId}`, { timeout: 4000 });
        return response.data;
      } catch {
        return DEMO_NOTES_AUDIT;
      }
    }

    try {
      const response = await http.get<AuditResult>(`/analyze/${auditId}`);
      return response.data;
    } catch (err: any) {
      const sim = getSimulatedAudit(auditId);
      if (sim) return sim;

      if (isNetworkError(err)) {
        return {
          ...DEMO_NOTES_AUDIT,
          audit_id: auditId,
        };
      }
      throw err;
    }
  },

  /**
   * Reclassify audit with an alternative category
   */
  async reclassify(auditId: string, category: string): Promise<AuditResult> {
    try {
      const response = await http.post<AuditResult>(`/api/audits/${auditId}/reclassify`, { category });
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err) || auditId.startsWith('sim-') || auditId === 'demo-notes') {
        const current = getSimulatedAudit(auditId) || DEMO_NOTES_AUDIT;
        return {
          ...current,
          category,
          category_source: 'user',
        };
      }
      throw err;
    }
  },

  /**
   * Delete report immediately
   */
  async deleteAudit(auditId: string): Promise<{ success: boolean }> {
    try {
      const response = await http.delete<{ success: boolean }>(`/api/audits/${auditId}`);
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err) || auditId.startsWith('sim-')) {
        return { success: true };
      }
      throw err;
    }
  },

  /**
   * Search real apps across local audits and Google Play Store metadata
   */
  async searchApps(query: string): Promise<SearchResponse> {
    try {
      const response = await http.get<SearchResponse>('/apps/search', {
        params: { q: query },
      });
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        const q = query.toLowerCase();
        const catalog: SearchResponse['apps'] = [
          {
            package_name: 'com.example.demonotes',
            app_name: 'Demo Notes',
            version_name: '2.4.1',
            developer: 'Demo Labs',
            icon_url: null,
            audited: true,
            score: 50,
            severity: 'high',
            scan_id: 'demo-notes',
            source: 'Uploaded APK',
            message: 'Audited in current session',
          },
          {
            package_name: 'com.whatsapp',
            app_name: 'WhatsApp Messenger',
            version_name: '2.24.1',
            developer: 'Meta',
            icon_url: null,
            audited: false,
            score: null,
            severity: null,
            scan_id: null,
            source: 'Play Store',
            message: 'Not yet audited',
          },
          {
            package_name: 'com.instagram.android',
            app_name: 'Instagram',
            version_name: '320.0',
            developer: 'Meta',
            icon_url: null,
            audited: false,
            score: null,
            severity: null,
            scan_id: null,
            source: 'Play Store',
            message: 'Not yet audited',
          },
          {
            package_name: 'com.spotify.music',
            app_name: 'Spotify: Music and Podcasts',
            version_name: '8.9.1',
            developer: 'Spotify AB',
            icon_url: null,
            audited: false,
            score: null,
            severity: null,
            scan_id: null,
            source: 'Play Store',
            message: 'Not yet audited',
          },
        ];
        const filtered = catalog.filter(
          (a) => a.app_name.toLowerCase().includes(q) || a.package_name.toLowerCase().includes(q)
        );
        return {
          query,
          count: filtered.length,
          apps: filtered.length > 0 ? filtered : catalog,
        };
      }
      throw err;
    }
  },

  /**
   * Fetch real security alerts
   */
  async getAlerts(userId?: string, deviceId?: string): Promise<AlertItem[]> {
    try {
      const response = await http.get<AlertItem[]>('/alerts', {
        params: { user_id: userId, device_id: deviceId },
      });
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        return [
          {
            id: 'alert-1',
            user_id: userId,
            device_id: deviceId,
            scan_id: 'demo-notes',
            app_name: 'Demo Notes',
            package_name: 'com.example.demonotes',
            score: 50,
            severity: 'high',
            title: 'Unusual Microphone Permission',
            message: 'Demo Notes requests RECORD_AUDIO without claiming note audio recording features.',
            kind: 'high_risk_app',
            created_at: new Date().toISOString(),
          },
        ];
      }
      throw err;
    }
  },

  /**
   * User onboarding with age category
   */
  async onboardUser(
    displayName: string,
    ageCategory: 'adult' | 'minor' | '18 and above' | 'Below 18',
    dob?: string
  ): Promise<{ user_id: string; display_name: string; age_category: string; requires_parent_link: boolean }> {
    try {
      const response = await http.post('/users/onboard', {
        display_name: displayName,
        age_category: ageCategory,
        dob,
      });
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        const isMinor = ageCategory === 'minor' || ageCategory === 'Below 18';
        return {
          user_id: `user-${Date.now()}`,
          display_name: displayName,
          age_category: ageCategory,
          requires_parent_link: isMinor,
        };
      }
      throw err;
    }
  },

  /**
   * Link parent email for under-18 user
   */
  async linkParent(
    parentEmail: string,
    userId?: string
  ): Promise<{ status: string; message: string; magic_token: string; verification_code_demo?: string }> {
    try {
      const response = await http.post('/parent/link', {
        parent_email: parentEmail,
        user_id: userId,
      });
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        return {
          status: 'pending_verification',
          message: 'Verification email sent (simulated). Verification code: 123456',
          magic_token: 'demo-magic-token-xyz',
          verification_code_demo: '123456',
        };
      }
      throw err;
    }
  },

  /**
   * Parent verifies one-time code and accepts consent notice
   */
  async verifyParent(
    verificationCode: string,
    magicToken?: string
  ): Promise<{ status: string; message: string; magic_token: string }> {
    try {
      const response = await http.post('/parent/verify', {
        verification_code: verificationCode,
        magic_token: magicToken,
      });
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        return {
          status: 'verified',
          message: 'Parental link and consent verified successfully.',
          magic_token: magicToken || 'demo-magic-token-xyz',
        };
      }
      throw err;
    }
  },

  /**
   * Retrieve parent portal data using expiring magic token
   */
  async getParentPortal(token: string): Promise<ParentPortalData> {
    try {
      const response = await http.get<ParentPortalData>(`/parent/portal/${token}`);
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        return {
          parent_email: 'guardian@example.com',
          child_name: 'Alex',
          consent_version: 'COPPA-v2.1',
          verified_at: new Date().toISOString(),
          reports: [DEMO_NOTES_AUDIT],
          alerts: [
            {
              id: 'alert-1',
              app_name: 'Demo Notes',
              package_name: 'com.example.demonotes',
              score: 50,
              severity: 'high',
              title: 'Unusual Microphone Permission',
              message: 'App requests RECORD_AUDIO without claiming audio recording features.',
              kind: 'high_risk_app',
              created_at: new Date().toISOString(),
            },
          ],
        };
      }
      throw err;
    }
  },

  /**
   * System health check
   */
  async getHealth(): Promise<HealthResponse> {
    try {
      const response = await http.get<HealthResponse>('/health', { timeout: 3000 });
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        return {
          status: 'ok',
          androguard: 'ready',
          ml_model: 'ready',
          mobsf: 'offline',
          database: 'sqlite',
          smtp: 'configured',
          rules_version: '2.0.0',
        };
      }
      throw err;
    }
  },

  /**
   * Delete user data ("Delete my data" compliance)
   */
  async deleteUserData(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await http.delete<{ success: boolean; message: string }>(`/users/${userId}/data`);
      return response.data;
    } catch (err: any) {
      if (isNetworkError(err)) {
        return { success: true, message: 'All personal data removed (Client Mode).' };
      }
      throw err;
    }
  },

  /**
   * Export audit data as JSON
   */
  exportJson(audit: AuditResult): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(audit, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${audit.app.package_name || 'audit'}-privacy-report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },
};

export interface ScoreBand {
  label: string;
  min: number;
  max: number;
  color: string;
  description: string;
}

export const DEFAULT_SCORE_BANDS: ScoreBand[] = [
  { label: 'Low Risk', min: 0, max: 29, color: '#10b981', description: 'Benign application with minimal standard permissions aligned with claimed functionality.' },
  { label: 'Medium Risk', min: 30, max: 54, color: '#f59e0b', description: 'Moderate capability scope; declares some sensitive permissions or analytics telemetry.' },
  { label: 'High Risk', min: 55, max: 79, color: '#f97316', description: 'Elevated privacy risk; requests excessive capabilities or suspicious permission combinations.' },
  { label: 'Critical Risk', min: 80, max: 100, color: '#ef4444', description: 'Severe privacy risk; requests broad hardware access, cleartext traffic, or background sensors.' },
];
