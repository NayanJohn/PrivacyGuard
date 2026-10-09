import React from 'react';
import { Link } from 'react-router-dom';
import {
  Smartphone,
  ShieldCheck,
  Activity,
  Bell,
  History,
  ArrowRight,
  RefreshCw,
  Wand2,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useDeviceApp } from '../context/DeviceAppContext';
import { AppNavTabs } from '../components/AppNavTabs';
import { PwaInstallBanner } from '../components/PwaInstallBanner';

export const AppHubPage: React.FC = () => {
  const {
    apps,
    runtimeEvents,
    overallDeviceScore,
    unresolvedAlertsCount,
    highRiskAppsCount,
    backgroundProbesCount,
    isScanning,
    scanProgress,
    lastScannedAt,
    scanDevice,
    fixAllHighRisk,
  } = useDeviceApp();

  const getScoreStatus = (score: number) => {
    if (score >= 80) {
      return {
        label: 'Protected & Hardened',
        color: 'text-emerald-400',
        borderColor: 'border-emerald-500/40',
        glowColor: 'shadow-[0_0_40px_rgba(16,185,129,0.25)]',
        bg: 'bg-emerald-500/10',
        desc: 'Permissions closely match legitimate app functionality. No critical unvetted background probes detected.',
      };
    }
    if (score >= 60) {
      return {
        label: 'Moderate Privacy Risk',
        color: 'text-amber-400',
        borderColor: 'border-amber-500/40',
        glowColor: 'shadow-[0_0_40px_rgba(245,158,11,0.25)]',
        bg: 'bg-amber-500/10',
        desc: 'A few installed applications declare sensitive capabilities or auxiliary telemetry SDKs worth reviewing.',
      };
    }
    return {
      label: 'Action Required',
      color: 'text-rose-400',
      borderColor: 'border-rose-500/40',
      glowColor: 'shadow-[0_0_40px_rgba(244,63,94,0.25)]',
      bg: 'bg-rose-500/10',
      desc: 'Multiple applications have continuous background location or contacts access without clear functional justification.',
    };
  };

  const status = getScoreStatus(overallDeviceScore);

  const featureCards = [
    {
      title: 'My Applications',
      subtitle: `${apps.length} Installed Packages Analyzed`,
      description: 'Audit declared vs granted permissions, inspect third-party tracker SDKs, and tune access per application.',
      icon: Smartphone,
      path: '/apps',
      badge: highRiskAppsCount > 0 ? `${highRiskAppsCount} Need Review` : 'All Optimal',
      badgeColor: highRiskAppsCount > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      title: 'Permission Matrix',
      subtitle: '8 System-Level Sensitive Groups',
      description: 'Visualize which applications have been granted Camera, Microphone, GPS, Contacts, and Accessibility access.',
      icon: ShieldCheck,
      path: '/permissions',
      badge: 'Least Privilege',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    {
      title: 'Runtime Monitor',
      subtitle: `${backgroundProbesCount} Background Probes in 24h`,
      description: 'Live behavioral telemetry engine detecting background location polls, sensor queries, and ad tracking pings in real time.',
      icon: Activity,
      path: '/runtime',
      badge: 'Live Engine',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      title: 'Privacy Alerts',
      subtitle: `${unresolvedAlertsCount} Active Intrusion Alerts`,
      description: 'Instant alerts for silent permission creep, suspicious background wake locks, and embedded advertising brokers.',
      icon: Bell,
      path: '/alerts',
      badge: unresolvedAlertsCount > 0 ? `${unresolvedAlertsCount} Unresolved` : '0 Alerts',
      badgeColor: unresolvedAlertsCount > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-slate-700 text-slate-300 border-slate-600',
    },
    {
      title: 'Version Drift & History',
      subtitle: 'Track Permission Creep Over Time',
      description: 'Compare previous vs updated APK releases to see permissions quietly added across app updates over the past 30 days.',
      icon: History,
      path: '/history',
      badge: '30-Day Trends',
      badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Sub-navigation tabs */}
      <AppNavTabs />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Hero Banner with Device Health Score */}
        <section className={`relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-10 border ${status.borderColor} ${status.glowColor} transition-all`}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Score Ring & Summary */}
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              {/* Radial score display */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="stroke-slate-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className={`transition-all duration-700 ${
                      overallDeviceScore >= 80
                        ? 'stroke-emerald-400'
                        : overallDeviceScore >= 60
                        ? 'stroke-amber-400'
                        : 'stroke-rose-500'
                    }`}
                    strokeWidth="8"
                    strokeDasharray={264}
                    strokeDashoffset={264 - (264 * overallDeviceScore) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
                    {overallDeviceScore}
                  </span>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                    / 100 Score
                  </span>
                </div>
              </div>

              {/* Status copy */}
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-900 border border-white/10">
                  <span className={`w-2 h-2 rounded-full ${overallDeviceScore >= 80 ? 'bg-emerald-400' : overallDeviceScore >= 60 ? 'bg-amber-400' : 'bg-rose-500'}`} />
                  <span className={status.color}>{status.label}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">Last scan: {lastScannedAt}</span>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Device Privacy Health Center
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {status.desc}
                </p>
              </div>
            </div>

            {/* Actions: Scan and Remediation */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={scanDevice}
                disabled={isScanning}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-display font-semibold text-sm flex items-center justify-center gap-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? `Scanning Device (${scanProgress}%)` : 'Scan Installed Apps Now'}</span>
              </button>

              {highRiskAppsCount > 0 && (
                <button
                  type="button"
                  onClick={fixAllHighRisk}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-display font-semibold text-sm flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <Wand2 className="w-4 h-4 text-cyan-400" />
                  <span>1-Click Fix All High-Risk Apps</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress bar during scan */}
          {isScanning && (
            <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
              <div className="flex justify-between text-xs font-mono text-cyan-300">
                <span>Inspecting declared permission manifests & background services...</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-200"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl glass-panel-subtle border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Installed Apps</span>
              <Smartphone className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-display font-bold text-white">
              {apps.length}
            </div>
            <p className="text-[11px] text-slate-400">
              {highRiskAppsCount > 0 ? (
                <span className="text-rose-400 font-semibold">{highRiskAppsCount} high concern</span>
              ) : (
                <span className="text-emerald-400 font-semibold">0 high concern</span>
              )}
            </p>
          </div>

          <div className="p-5 rounded-2xl glass-panel-subtle border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Active Alerts</span>
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-display font-bold text-white">
              {unresolvedAlertsCount}
            </div>
            <p className="text-[11px] text-slate-400">
              {unresolvedAlertsCount > 0 ? (
                <Link to="/alerts" className="text-amber-300 hover:underline">Requires user review &rarr;</Link>
              ) : (
                <span className="text-emerald-400">All clear</span>
              )}
            </p>
          </div>

          <div className="p-5 rounded-2xl glass-panel-subtle border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Background Probes</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-display font-bold text-white">
              {backgroundProbesCount}
            </div>
            <p className="text-[11px] text-slate-400">
              Logged in past 24 hours
            </p>
          </div>

          <div className="p-5 rounded-2xl glass-panel-subtle border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Telemetry State</span>
              <Radio className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live behavior engine active
            </p>
          </div>
        </div>

        {/* Feature Navigation Cards Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              PrivacyGuard Features
            </h2>
            <span className="text-xs text-slate-400">Select any module to inspect</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featureCards.map((feat) => {
              const Icon = feat.icon;
              return (
                <Link
                  key={feat.title}
                  to={feat.path}
                  className="group p-6 rounded-2xl glass-panel hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(6,182,212,0.15)] flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-105 group-hover:border-cyan-400 transition-all">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-mono border ${feat.badgeColor}`}>
                        {feat.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-lg text-white group-hover:text-cyan-300 transition-colors">
                        {feat.title}
                      </h3>
                      <p className="text-xs text-cyan-400 font-mono mt-0.5">
                        {feat.subtitle}
                      </p>
                      <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                    <span>Open Feature</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Live Telemetry Mini-Feed */}
        <section className="p-6 rounded-2xl glass-panel border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="font-display font-bold text-base text-white">
                Live Runtime Activity Stream
              </h3>
            </div>
            <Link
              to="/runtime"
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>View full event monitor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-white/5">
            {runtimeEvents.slice(0, 4).map((evt) => (
              <div key={evt.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-500 text-[11px] shrink-0">
                    {evt.timeFormatted}
                  </span>
                  <span className="font-semibold text-slate-200">
                    {evt.appName}
                  </span>
                  <span className="text-slate-400 hidden sm:inline">
                    &rarr; {evt.action}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <span className="text-slate-400 font-mono text-[11px] truncate max-w-xs">
                    {evt.target}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${
                      evt.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : evt.severity === 'suspicious'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border border-white/5'
                    }`}
                  >
                    {evt.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PWA Install Banner */}
        <PwaInstallBanner variant="banner" />
      </div>
    </div>
  );
};
