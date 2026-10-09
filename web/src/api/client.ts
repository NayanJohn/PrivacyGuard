import axios from 'axios';
import type {
  AuditResult,
  AuditCreationResponse,
  AlertItem,
  SearchResponse,
  ParentPortalData,
  HealthResponse,
} from './schema';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail || error.response?.data?.message || error.message;
    const customError = new Error(detail);
    (customError as any).response = error.response;
    return Promise.reject(customError);
  }
);

export const apiClient = {
  /**
   * Upload an APK file with user claim and category to the real backend engine
   */
  async uploadApk(
    file: File | Blob,
    fileName: string,
    claim: string,
    category: string,
    onProgress?: (percent: number) => void
  ): Promise<AuditCreationResponse> {
    const formData = new FormData();
    formData.append('file', file, fileName);
    formData.append('claim', claim);
    formData.append('category', category);

    const response = await http.post<AuditCreationResponse>('/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 minutes for up to 500 MB uploads
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  },

  /**
   * Poll for current audit state and result from the backend
   */
  async getAudit(auditId: string): Promise<AuditResult> {
    const response = await http.get<AuditResult>(`/analyze/${auditId}`);
    return response.data;
  },

  /**
   * Reclassify audit with an alternative category
   */
  async reclassify(auditId: string, category: string): Promise<AuditResult> {
    const response = await http.post<AuditResult>(`/api/audits/${auditId}/reclassify`, { category });
    return response.data;
  },

  /**
   * Delete report immediately
   */
  async deleteAudit(auditId: string): Promise<{ success: boolean }> {
    const response = await http.delete<{ success: boolean }>(`/api/audits/${auditId}`);
    return response.data;
  },

  /**
   * Search real apps across local audits and Google Play Store metadata
   */
  async searchApps(query: string): Promise<SearchResponse> {
    const response = await http.get<SearchResponse>('/apps/search', {
      params: { q: query },
    });
    return response.data;
  },

  /**
   * Fetch real security alerts
   */
  async getAlerts(userId?: string, deviceId?: string): Promise<AlertItem[]> {
    const response = await http.get<AlertItem[]>('/alerts', {
      params: { user_id: userId, device_id: deviceId },
    });
    return response.data;
  },

  /**
   * User onboarding with age category
   */
  async onboardUser(
    displayName: string,
    ageCategory: 'adult' | 'minor' | '18 and above' | 'Below 18',
    dob?: string
  ): Promise<{ user_id: string; display_name: string; age_category: string; requires_parent_link: boolean }> {
    const response = await http.post('/users/onboard', {
      display_name: displayName,
      age_category: ageCategory,
      dob,
    });
    return response.data;
  },

  /**
   * Link parent email for under-18 user
   */
  async linkParent(
    parentEmail: string,
    userId?: string
  ): Promise<{ status: string; message: string; magic_token: string; verification_code_demo?: string }> {
    const response = await http.post('/parent/link', {
      parent_email: parentEmail,
      user_id: userId,
    });
    return response.data;
  },

  /**
   * Parent verifies one-time code and accepts consent notice
   */
  async verifyParent(
    verificationCode: string,
    magicToken?: string
  ): Promise<{ status: string; message: string; magic_token: string }> {
    const response = await http.post('/parent/verify', {
      verification_code: verificationCode,
      magic_token: magicToken,
    });
    return response.data;
  },

  /**
   * Retrieve parent portal data using expiring magic token
   */
  async getParentPortal(token: string): Promise<ParentPortalData> {
    const response = await http.get<ParentPortalData>(`/parent/portal/${token}`);
    return response.data;
  },

  /**
   * System health check
   */
  async getHealth(): Promise<HealthResponse> {
    const response = await http.get<HealthResponse>('/health');
    return response.data;
  },

  /**
   * Delete user data ("Delete my data" compliance)
   */
  async deleteUserData(userId: string): Promise<{ success: boolean; message: string }> {
    const response = await http.delete<{ success: boolean; message: string }>(`/users/${userId}/data`);
    return response.data;
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
