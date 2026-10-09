export type AppRiskBand = 'safe' | 'low' | 'moderate' | 'elevated' | 'high';

export type PermissionGrantStatus = 'granted' | 'denied' | 'while_in_use' | 'background_probed';

export interface AppPermission {
  id: string;
  name: string;
  category: 'location' | 'camera' | 'microphone' | 'contacts' | 'sms' | 'storage' | 'bluetooth' | 'sensors' | 'system';
  grantStatus: PermissionGrantStatus;
  isSensitive: boolean;
  justified: boolean;
  purposeNote: string;
  benchmarkPeerAdoption: number; // e.g. 12% of similar apps
}

export interface AppTracker {
  name: string;
  category: 'Advertising' | 'Analytics' | 'Crash Reporting' | 'Location Tracking' | 'Profiling';
  company: string;
  website?: string;
  riskWeight: number; // 1-10
}

export interface InstalledApp {
  id: string;
  name: string;
  packageName: string;
  version: string;
  category: string;
  installDate: string;
  lastUpdated: string;
  sizeMb: number;
  isSystemApp: boolean;
  riskScore: number; // 0-100
  riskBand: AppRiskBand;
  iconName: string;
  iconBg: string;
  iconColor: string;
  permissions: AppPermission[];
  trackers: AppTracker[];
  backgroundProbes24h: number;
  lastActive: string;
  networkTelemetryMb24h: number;
  statusText: string;
}

export interface PermissionGroupSummary {
  id: string;
  name: string;
  key: string;
  description: string;
  iconName: string;
  category: string;
  dangerLevel: 'critical' | 'high' | 'medium' | 'low';
  totalAppsGranted: number;
  totalAppsDeclared: number;
  backgroundAccessApps: number;
}

export interface RuntimeEvent {
  id: string;
  timestamp: string;
  timeFormatted: string;
  packageName: string;
  appName: string;
  action: string;
  target: string;
  permissionKey: string;
  severity: 'normal' | 'auxiliary' | 'suspicious' | 'critical';
  isBackground: boolean;
  details: string;
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  timeFormatted: string;
  appName: string;
  packageName: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'permission_creep' | 'background_probe' | 'tracker_added' | 'excessive_access';
  title: string;
  description: string;
  permissionTarget?: string;
  resolved: boolean;
  actionLabel: string;
}

export interface AppVersionDiff {
  id: string;
  appName: string;
  packageName: string;
  previousVersion: string;
  currentVersion: string;
  date: string;
  addedPermissions: string[];
  removedPermissions: string[];
  addedTrackers: string[];
  riskScoreDelta: number; // e.g. +34
  previousRiskScore: number;
  currentRiskScore: number;
  notes: string;
}

export interface DeviceStats {
  totalApps: number;
  highRiskCount: number;
  moderateRiskCount: number;
  safeCount: number;
  criticalAlertsCount: number;
  backgroundProbesTotal24h: number;
  overallScore: number; // 0-100
  lastScanTimestamp: string;
}
