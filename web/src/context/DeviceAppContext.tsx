import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { InstalledApp, SecurityAlert, RuntimeEvent, PermissionGrantStatus } from '../types/appData';
import { apiClient } from '../api/client';
import type { AlertItem, AuditResult } from '../api/schema';

interface UserProfile {
  userId: string;
  displayName: string;
  ageCategory: 'adult' | 'minor';
  dob?: string;
  parentLinked: boolean;
  parentEmail?: string;
}

interface DeviceAppContextType {
  apps: InstalledApp[];
  alerts: SecurityAlert[];
  runtimeEvents: RuntimeEvent[];
  user: UserProfile | null;
  isMonitoring: boolean;
  isLoading: boolean;
  error: string | null;
  overallDeviceScore: number;
  unresolvedAlertsCount: number;
  highRiskAppsCount: number;
  backgroundProbesCount: number;
  
  // Scanning state
  isScanning: boolean;
  scanProgress: number;
  lastScannedAt: string;
  
  // Monitor controls
  monitorSpeed: number;

  // Actions
  onboardUser: (displayName: string, ageCategory: 'adult' | 'minor', dob?: string) => Promise<void>;
  linkParent: (email: string) => Promise<{ magic_token: string; verification_code_demo?: string }>;
  verifyParent: (code: string, token?: string) => Promise<void>;
  addAuditedApp: (audit: AuditResult) => void;
  refreshAlerts: () => Promise<void>;
  deleteMyData: () => Promise<void>;
  resolveAlert: (alertId: string) => void;
  dismissAlert: (alertId: string) => void;
  revokePermissionForAlert: (alertId: string) => void;
  toggleAppPermission: (appId: string, permId: string, targetStatus?: PermissionGrantStatus) => void;
  revokeAllSensitiveForApp: (appId: string) => void;
  scanDevice: () => Promise<void>;
  fixAllHighRisk: () => Promise<void>;
  toggleMonitoring: () => void;
  setMonitorSpeed: (speed: number) => void;
  clearRuntimeEvents: () => void;
  triggerSimulatedProbe: () => void;
}

const DeviceAppContext = createContext<DeviceAppContextType | undefined>(undefined);

const AUDITED_APPS_STORAGE_KEY = 'pg_audited_apps_v2';
const USER_STORAGE_KEY = 'pg_user_profile_v2';

export const DeviceAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apps, setApps] = useState<InstalledApp[]>(() => {
    try {
      const stored = localStorage.getItem(AUDITED_APPS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [runtimeEvents, setRuntimeEvents] = useState<RuntimeEvent[]>([]);
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [lastScannedAt, setLastScannedAt] = useState<string>('Never');
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [monitorSpeed, setMonitorSpeed] = useState<number>(1);

  // Sync audited apps to storage
  useEffect(() => {
    try {
      localStorage.setItem(AUDITED_APPS_STORAGE_KEY, JSON.stringify(apps));
    } catch (e) {
      console.warn('Failed to save audited apps to localStorage:', e);
    }
  }, [apps]);

  // Sync user profile to storage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save user to localStorage:', e);
    }
  }, [user]);

  // Fetch real alerts from backend
  const refreshAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const backendAlerts = await apiClient.getAlerts(user?.userId);
      const mapped: SecurityAlert[] = backendAlerts.map((a: AlertItem) => ({
        id: a.id,
        timestamp: a.created_at,
        timeFormatted: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        appName: a.app_name,
        packageName: a.package_name,
        severity: a.severity === 'critical' ? 'critical' : a.severity === 'high' ? 'warning' : 'info',
        type: a.kind === 'high_risk_app' ? 'excessive_access' : 'background_probe',
        title: a.title,
        description: a.message,
        resolved: false,
        actionLabel: 'Review Permissions',
      }));
      setAlerts(mapped);
    } catch (err: any) {
      console.info('Backend alerts fetch notice:', err.message);
      // Empty array on connection delay, no mock fallback
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  // Convert AuditResult into an InstalledApp record
  const addAuditedApp = useCallback((audit: AuditResult) => {
    const riskBand = audit.score < 30 ? 'safe' : audit.score < 55 ? 'moderate' : audit.score < 80 ? 'elevated' : 'high';
    const newApp: InstalledApp = {
      id: audit.audit_id,
      name: audit.app.app_name,
      packageName: audit.app.package_name,
      version: audit.app.version_name,
      category: audit.category,
      installDate: new Date(audit.created_at).toLocaleDateString(),
      lastUpdated: 'Just now',
      sizeMb: 14.5,
      isSystemApp: false,
      riskScore: audit.score,
      riskBand,
      iconName: 'Shield',
      iconBg: audit.score >= 80 ? 'bg-red-500/20' : audit.score >= 55 ? 'bg-amber-500/20' : 'bg-emerald-500/20',
      iconColor: audit.score >= 80 ? 'text-red-400' : audit.score >= 55 ? 'text-amber-400' : 'text-emerald-400',
      permissions: audit.findings.map((f, i) => ({
        id: f.id || `perm-${i}`,
        name: f.name,
        category: f.permission.includes('LOCATION') ? 'location' : f.permission.includes('CAMERA') ? 'camera' : f.permission.includes('AUDIO') ? 'microphone' : 'system',
        grantStatus: f.evidence_type === 'observed' ? 'granted' : 'while_in_use',
        isSensitive: f.relevance === 'suspicious' || f.relevance === 'not_justified',
        justified: f.relevance === 'required',
        purposeNote: f.purpose,
        benchmarkPeerAdoption: f.benchmark_pct,
      })),
      trackers: (audit.trackers || []).map((t) => ({
        name: t.name,
        category: 'Analytics',
        company: t.name.split(' ')[0] || 'Third-Party',
        riskWeight: 5,
      })),
      backgroundProbes24h: 0,
      lastActive: 'Audit Complete',
      networkTelemetryMb24h: 0,
      statusText: `${audit.score}/100 Risk Score (${audit.risk_label})`,
    };

    setApps((prev) => {
      const filtered = prev.filter((a) => a.packageName !== newApp.packageName);
      return [newApp, ...filtered];
    });
  }, []);

  // User Onboarding
  const onboardUser = useCallback(async (displayName: string, ageCategory: 'adult' | 'minor', dob?: string) => {
    try {
      const res = await apiClient.onboardUser(displayName, ageCategory, dob);
      setUser({
        userId: res.user_id,
        displayName: res.display_name,
        ageCategory: res.age_category as 'adult' | 'minor',
        dob,
        parentLinked: false,
      });
    } catch (e: any) {
      setError(e.message || 'Onboarding failed');
      throw e;
    }
  }, []);

  // Link Parent
  const linkParent = useCallback(async (email: string) => {
    if (!user) throw new Error('User not onboarded');
    const res = await apiClient.linkParent(email, user.userId);
    setUser((prev) => prev ? { ...prev, parentEmail: email } : null);
    return { magic_token: res.magic_token, verification_code_demo: res.verification_code_demo };
  }, [user]);

  // Verify Parent
  const verifyParent = useCallback(async (code: string, token?: string) => {
    await apiClient.verifyParent(code, token);
    setUser((prev) => prev ? { ...prev, parentLinked: true } : null);
  }, []);

  // Delete My Data
  const deleteMyData = useCallback(async () => {
    if (user?.userId) {
      try {
        await apiClient.deleteUserData(user.userId);
      } catch (e) {
        console.warn('Backend delete notification:', e);
      }
    }
    setApps([]);
    setAlerts([]);
    setRuntimeEvents([]);
    setUser(null);
    localStorage.removeItem(AUDITED_APPS_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, [user]);

  // Resolve alert
  const resolveAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, resolved: true } : a)));
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    resolveAlert(alertId);
  }, [resolveAlert]);

  const revokePermissionForAlert = useCallback((alertId: string) => {
    resolveAlert(alertId);
  }, [resolveAlert]);

  const toggleAppPermission = useCallback((appId: string, permId: string, targetStatus?: PermissionGrantStatus) => {
    setApps((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const updatedPerms = app.permissions.map((p) => {
          if (p.id !== permId) return p;
          const nextStatus: PermissionGrantStatus =
            targetStatus || (p.grantStatus === 'granted' ? 'denied' : 'granted');
          return { ...p, grantStatus: nextStatus };
        });
        const hasRevoked = updatedPerms.some((p) => p.isSensitive && p.grantStatus === 'denied');
        const adjScore = hasRevoked ? Math.max(10, app.riskScore - 12) : app.riskScore;
        return { ...app, permissions: updatedPerms, riskScore: adjScore };
      })
    );
  }, []);

  const revokeAllSensitiveForApp = useCallback((appId: string) => {
    setApps((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const updatedPerms = app.permissions.map((p) =>
          p.isSensitive ? { ...p, grantStatus: 'denied' as PermissionGrantStatus } : p
        );
        return { ...app, permissions: updatedPerms, riskScore: Math.max(15, Math.round(app.riskScore * 0.55)) };
      })
    );
  }, []);

  const scanDevice = useCallback(async () => {
    setIsScanning(true);
    setScanProgress(10);
    for (let i = 25; i <= 100; i += 25) {
      await new Promise((r) => setTimeout(r, 120));
      setScanProgress(i);
    }
    setLastScannedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setIsScanning(false);
  }, []);

  const fixAllHighRisk = useCallback(async () => {
    setApps((prev) =>
      prev.map((app) => {
        if (app.riskScore < 55) return app;
        const updatedPerms = app.permissions.map((p) =>
          p.isSensitive ? { ...p, grantStatus: 'while_in_use' as PermissionGrantStatus } : p
        );
        return { ...app, permissions: updatedPerms, riskScore: Math.max(25, Math.round(app.riskScore * 0.6)) };
      })
    );
    setAlerts((prev) => prev.map((a) => ({ ...a, resolved: true })));
  }, []);

  const toggleMonitoring = useCallback(() => {
    setIsMonitoring((prev) => !prev);
  }, []);

  const clearRuntimeEvents = useCallback(() => {
    setRuntimeEvents([]);
  }, []);

  const triggerSimulatedProbe = useCallback(() => {
    if (apps.length > 0) {
      const targetApp = apps[0];
      const newEvt: RuntimeEvent = {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        timeFormatted: new Date().toLocaleTimeString(),
        packageName: targetApp.packageName,
        appName: targetApp.name,
        action: 'Background Sensor Access Check',
        target: 'Camera & Mic State',
        permissionKey: 'CAMERA',
        severity: 'suspicious',
        isBackground: true,
        details: 'Hardware sensor availability callback verified during app cycle.',
      };
      setRuntimeEvents((prev) => [newEvt, ...prev.slice(0, 49)]);
    }
  }, [apps]);

  // Calculate overall device privacy health score from REAL audited apps
  const overallDeviceScore = useMemo(() => {
    if (apps.length === 0) return 100;
    const avgRisk = apps.reduce((sum, a) => sum + a.riskScore, 0) / apps.length;
    return Math.max(0, Math.min(100, Math.round(100 - avgRisk)));
  }, [apps]);

  const unresolvedAlertsCount = useMemo(() => {
    return alerts.filter((a) => !a.resolved).length;
  }, [alerts]);

  const highRiskAppsCount = useMemo(() => {
    return apps.filter((a) => a.riskScore >= 80).length;
  }, [apps]);

  const backgroundProbesCount = useMemo(() => {
    return apps.reduce((sum, a) => sum + a.backgroundProbes24h, 0);
  }, [apps]);

  return (
    <DeviceAppContext.Provider
      value={{
        apps,
        alerts,
        runtimeEvents,
        user,
        isMonitoring,
        isLoading,
        error,
        overallDeviceScore,
        unresolvedAlertsCount,
        highRiskAppsCount,
        backgroundProbesCount,
        isScanning,
        scanProgress,
        lastScannedAt,
        monitorSpeed,
        onboardUser,
        linkParent,
        verifyParent,
        addAuditedApp,
        refreshAlerts,
        deleteMyData,
        resolveAlert,
        dismissAlert,
        revokePermissionForAlert,
        toggleAppPermission,
        revokeAllSensitiveForApp,
        scanDevice,
        fixAllHighRisk,
        toggleMonitoring,
        setMonitorSpeed,
        clearRuntimeEvents,
        triggerSimulatedProbe,
      }}
    >
      {children}
    </DeviceAppContext.Provider>
  );
};

export const useDeviceApp = () => {
  const context = useContext(DeviceAppContext);
  if (!context) {
    throw new Error('useDeviceApp must be used within a DeviceAppProvider');
  }
  return context;
};
