import { Smartphone, ShieldCheck, Bell, History, Activity } from 'lucide-react';
import type React from 'react';
import type { LockedFeature } from '../context/InstallPromptContext';

export const APP_CATEGORIES = [
  'Auto-detect from claim',
  'Notes',
  'Messaging',
  'Camera & Photography',
  'Social',
  'Finance & Banking',
  'Games',
  'Utilities & Tools',
  'Navigation & Maps',
  'Productivity',
  'Health & Fitness',
  'Education',
  'Shopping',
  'Entertainment',
] as const;

export const AUDIT_STAGES = [
  'Androguard (Manifest & Bytecode Feature Extraction)',
  'RiskInDroid (ML Risk Engine - 40% Weight)',
  'Privacy Heuristics (Policy & Combinations - 25% Weight)',
  'MobSF REST (Static Security Scan - 35% Weight)',
  'Complete (Risk Synthesis & Severity Band)',
] as const;

export interface LockedFeatureInfo {
  title: LockedFeature;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

export const LOCKED_FEATURES: LockedFeatureInfo[] = [
  {
    title: 'My Applications',
    summary: 'Inspect apps already installed on your device without uploading files.',
    icon: Smartphone,
    tag: 'On-Device',
  },
  {
    title: 'Permission Dashboard',
    summary: 'See which sensitive permissions apps have actually been granted by Android at runtime.',
    icon: ShieldCheck,
    tag: 'Runtime Grant',
  },
  {
    title: 'Alerts',
    summary: 'Receive instant notifications when apps silently update or declare new permissions.',
    icon: Bell,
    tag: 'Live Monitoring',
  },
  {
    title: 'History',
    summary: 'Track how permissions, SDKs, and risk scores evolve across app versions over time.',
    icon: History,
    tag: 'Version Delta',
  },
  {
    title: 'Runtime Monitor',
    summary: 'Observe foreground/background activity and launch triggers where Android OS allows.',
    icon: Activity,
    tag: 'Behavior Engine',
  },
];
