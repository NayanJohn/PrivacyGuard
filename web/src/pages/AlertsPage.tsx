import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { useDeviceApp } from '../context/DeviceAppContext';
import { AppNavTabs } from '../components/AppNavTabs';

export const AlertsPage: React.FC = () => {
  const {
    alerts,
    unresolvedAlertsCount,
    dismissAlert,
    revokePermissionForAlert,
  } = useDeviceApp();

  const [filterTab, setFilterTab] = useState<'all' | 'critical' | 'warning' | 'resolved'>('all');

  const filteredAlerts = alerts.filter((alert) => {
    if (filterTab === 'resolved') return alert.resolved;
    if (alert.resolved) return false;
    if (filterTab === 'critical') return alert.severity === 'critical';
    if (filterTab === 'warning') return alert.severity === 'warning';
    return true;
  });

  return (
    <div className="min-h-screen pb-20">
      <AppNavTabs />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 mb-2">
              <Bell className="w-3.5 h-3.5" />
              <span>Live Intrusion & Drift Notifications</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Security & Privacy Alerts
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Active detection of silent permission creep, unauthorized background location queries, and newly embedded ad tracking SDKs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border ${
              unresolvedAlertsCount > 0
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}>
              {unresolvedAlertsCount} Unresolved Alerts
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl glass-panel border border-white/5 w-fit">
          {(
            [
              { id: 'all', label: 'Active Alerts' },
              { id: 'critical', label: 'Critical' },
              { id: 'warning', label: 'Warnings' },
              { id: 'resolved', label: 'Resolved History' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                filterTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Alerts Feed */}
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center glass-panel rounded-3xl border border-white/5 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="font-display font-bold text-lg text-white">
                {filterTab === 'resolved' ? 'No resolved alerts logged yet.' : 'All Clear! No Active Security Alerts'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No unauthorized background probes or permission escalation detected across your installed applications.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-6 rounded-2xl glass-panel border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                  alert.resolved
                    ? 'border-white/5 opacity-60'
                    : alert.severity === 'critical'
                    ? 'border-rose-500/40 shadow-[0_10px_30px_rgba(244,63,94,0.1)]'
                    : 'border-amber-500/30'
                }`}
              >
                <div className="space-y-3 min-w-0 max-w-2xl">
                  {/* Alert Meta row */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase border ${
                        alert.resolved
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : alert.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {alert.resolved ? 'Resolved' : alert.severity}
                    </span>

                    <span className="font-bold text-white">
                      {alert.appName}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      ({alert.packageName})
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 text-[11px]">
                      {alert.timeFormatted}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-display font-bold text-base text-white">
                      {alert.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>

                  {alert.permissionTarget && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-cyan-300">
                      <span>Target: {alert.permissionTarget}</span>
                    </div>
                  )}
                </div>

                {/* Remediation Action Buttons */}
                {!alert.resolved && (
                  <div className="flex items-center gap-2 self-stretch md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => revokePermissionForAlert(alert.id)}
                      className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-display flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>{alert.actionLabel}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => dismissAlert(alert.id)}
                      className="px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Dismiss Alert"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
