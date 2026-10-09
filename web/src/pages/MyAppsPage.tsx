import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Shield,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  X,
  Wand2,
  Radio,
} from 'lucide-react';
import { useDeviceApp } from '../context/DeviceAppContext';
import { AppNavTabs } from '../components/AppNavTabs';
import { AppIcon } from '../components/AppIcon';
import type { InstalledApp } from '../types/appData';

export const MyAppsPage: React.FC = () => {
  const { apps, toggleAppPermission, revokeAllSensitiveForApp } = useDeviceApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | 'high' | 'moderate' | 'safe'>('all');
  const [sortBy, setSortBy] = useState<'risk' | 'name' | 'probes' | 'size'>('risk');
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null);

  // Keep selected app synchronized with latest state updates
  const activeApp = useMemo(() => {
    if (!selectedApp) return null;
    return apps.find((a) => a.id === selectedApp.id) || selectedApp;
  }, [selectedApp, apps]);

  const filteredApps = useMemo(() => {
    return apps
      .filter((app) => {
        const matchesSearch =
          app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.category.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (selectedRiskFilter === 'high') {
          return app.riskBand === 'high' || app.riskBand === 'elevated';
        }
        if (selectedRiskFilter === 'moderate') {
          return app.riskBand === 'moderate' || app.riskBand === 'low';
        }
        if (selectedRiskFilter === 'safe') {
          return app.riskBand === 'safe';
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'risk') return b.riskScore - a.riskScore;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'probes') return b.backgroundProbes24h - a.backgroundProbes24h;
        if (sortBy === 'size') return b.sizeMb - a.sizeMb;
        return 0;
      });
  }, [apps, searchQuery, selectedRiskFilter, sortBy]);

  const getRiskBadge = (score: number) => {
    if (score >= 70) {
      return {
        bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        label: 'High Concern',
      };
    }
    if (score >= 40) {
      return {
        bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        label: 'Elevated',
      };
    }
    if (score >= 20) {
      return {
        bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        label: 'Moderate',
      };
    }
    return {
      bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      label: 'Safe',
    };
  };

  return (
    <div className="min-h-screen pb-20">
      <AppNavTabs />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header & Description */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 mb-2">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Installed Application Scanner</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              My Applications
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Inspect on-device installed applications, analyze declared permissions against legitimate category claims, and adjust runtime access.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">
              Showing <strong className="text-white">{filteredApps.length}</strong> of {apps.length} apps
            </span>
          </div>
        </div>

        {/* Search, Filter Tabs & Sort Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl glass-panel border border-white/5">
          {/* Search bar */}
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by app name, package, or category..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: 'All Apps' },
                { id: 'high', label: 'High Concern' },
                { id: 'moderate', label: 'Moderate' },
                { id: 'safe', label: 'Safe / Low' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedRiskFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedRiskFilter === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'risk' | 'name' | 'probes' | 'size')}
              className="bg-slate-900/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="risk">Sort: Highest Risk</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="probes">Sort: Background Probes</option>
              <option value="size">Sort: App Size</option>
            </select>
          </div>
        </div>

        {/* Application Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => {
            const badge = getRiskBadge(app.riskScore);
            return (
              <div
                key={app.id}
                className="group p-5 rounded-2xl glass-panel border border-white/5 hover:border-cyan-500/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(6,182,212,0.1)] flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Bar: Icon, Name & Score */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl ${app.iconBg} ${app.iconColor} border border-white/10 flex items-center justify-center shrink-0`}>
                        <AppIcon name={app.iconName} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-bold text-base text-white group-hover:text-cyan-300 transition-colors truncate">
                          {app.name}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-400 truncate">
                          {app.packageName}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${badge.bg}`}>
                        {app.riskScore}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Status explanation */}
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {app.statusText}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-white/5">
                      v{app.version}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-white/5">
                      {app.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-white/5">
                      {app.sizeMb} MB
                    </span>
                  </div>

                  {/* Highlights: Permissions & Trackers */}
                  <div className="pt-2 border-t border-white/5 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-900/40">
                      <div className="font-mono font-bold text-slate-200">
                        {app.permissions.length}
                      </div>
                      <div className="text-[10px] text-slate-400">Declared</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/40">
                      <div className={`font-mono font-bold ${app.trackers.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {app.trackers.length}
                      </div>
                      <div className="text-[10px] text-slate-400">Trackers</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/40">
                      <div className={`font-mono font-bold ${app.backgroundProbes24h > 10 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {app.backgroundProbes24h}
                      </div>
                      <div className="text-[10px] text-slate-400">24h Probes</div>
                    </div>
                  </div>
                </div>

                {/* Inspect Action */}
                <button
                  type="button"
                  onClick={() => setSelectedApp(app)}
                  className="mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-cyan-950/60 text-cyan-300 border border-cyan-500/20 hover:border-cyan-400 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Review & Adjust Permissions</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {filteredApps.length === 0 && (
          <div className="text-center py-16 glass-panel rounded-3xl border border-white/5 space-y-4 max-w-lg mx-auto">
            <Smartphone className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">
              {apps.length === 0 ? "No apps scanned yet" : "No applications match your filter"}
            </h3>
            <p className="text-xs text-slate-400">
              {apps.length === 0
                ? "No apps scanned yet. Upload an APK or install the Android app to begin explainable privacy monitoring."
                : "Try clearing your search query or switching risk filter tabs."}
            </p>
            {apps.length === 0 && (
              <div className="pt-2 flex justify-center gap-3">
                <a
                  href="/"
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
                >
                  Upload an APK
                </a>
                <a
                  href="/search"
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-white/10 transition-colors"
                >
                  Search App Registry
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* App Detail Slide-over / Modal */}
      {activeApp && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => setSelectedApp(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl glass-panel border-l border-cyan-500/30 p-6 sm:p-8 overflow-y-auto space-y-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl ${activeApp.iconBg} ${activeApp.iconColor} border border-white/10 flex items-center justify-center shrink-0`}>
                    <AppIcon name={activeApp.iconName} className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-xl text-white">
                      {activeApp.name}
                    </h2>
                    <p className="text-xs font-mono text-cyan-400">
                      {activeApp.packageName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Dynamic Score & 1-Click Fix */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400">Calculated Risk Score</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-display font-extrabold text-2xl text-white">
                      {activeApp.riskScore}
                    </span>
                    <span className="text-xs font-mono text-slate-400">/ 100</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${getRiskBadge(activeApp.riskScore).bg}`}>
                      {getRiskBadge(activeApp.riskScore).label}
                    </span>
                  </div>
                </div>

                {activeApp.permissions.some((p) => p.isSensitive && !p.justified && p.grantStatus !== 'denied') && (
                  <button
                    type="button"
                    onClick={() => revokeAllSensitiveForApp(activeApp.id)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Revoke Unjustified</span>
                  </button>
                )}
              </div>

              {/* Declared Permissions with Interactive Toggle Switches */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Declared Permissions ({activeApp.permissions.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">Interactive Simulation</span>
                </div>

                <div className="space-y-2.5">
                  {activeApp.permissions.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900/40 text-center text-xs text-slate-400">
                      No permissions declared by this application.
                    </div>
                  ) : (
                    activeApp.permissions.map((perm) => (
                      <div
                        key={perm.id}
                        className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-100">
                                {perm.name}
                              </span>
                              {!perm.justified ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  Unjustified
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Claim Justified
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {perm.purposeNote}
                            </p>
                          </div>
                        </div>

                        {/* Grant Status Segmented Toggle */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className="text-[11px] text-slate-400 font-mono">
                            Peer baseline: {perm.benchmarkPeerAdoption}% apps
                          </span>

                          <div className="inline-flex rounded-lg bg-black/50 p-0.5 border border-white/10 text-[11px]">
                            <button
                              type="button"
                              onClick={() => toggleAppPermission(activeApp.id, perm.id, 'granted')}
                              className={`px-2 py-1 rounded-md transition-colors ${
                                perm.grantStatus === 'granted'
                                  ? 'bg-emerald-500/30 text-emerald-300 font-bold'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Granted
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleAppPermission(activeApp.id, perm.id, 'while_in_use')}
                              className={`px-2 py-1 rounded-md transition-colors ${
                                perm.grantStatus === 'while_in_use'
                                  ? 'bg-cyan-500/30 text-cyan-300 font-bold'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              In-Use
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleAppPermission(activeApp.id, perm.id, 'denied')}
                              className={`px-2 py-1 rounded-md transition-colors ${
                                perm.grantStatus === 'denied'
                                  ? 'bg-rose-500/30 text-rose-300 font-bold'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Revoked
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Detected Third-Party Trackers */}
              <div className="space-y-3">
                <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-400" />
                  Embedded Trackers & Ad SDKs ({activeApp.trackers.length})
                </h3>

                {activeApp.trackers.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>No commercial advertising or profiling trackers found in this APK.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeApp.trackers.map((tracker, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">
                            {tracker.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {tracker.company} • {tracker.category}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Weight {tracker.riskWeight}/10
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Telemetry info */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>24h Background Probes:</span>
                  <span className="font-mono text-slate-200">{activeApp.backgroundProbes24h}</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Telemetry Transmitted:</span>
                  <span className="font-mono text-slate-200">{activeApp.networkTelemetryMb24h} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Installed On:</span>
                  <span className="font-mono text-slate-200">{activeApp.installDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Active:</span>
                  <span className="font-mono text-slate-200">{activeApp.lastActive}</span>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
