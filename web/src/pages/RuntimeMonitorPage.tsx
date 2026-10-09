import React, { useState } from 'react';
import {
  Activity,
  Play,
  Pause,
  Trash2,
  Zap,
} from 'lucide-react';
import { useDeviceApp } from '../context/DeviceAppContext';
import { AppNavTabs } from '../components/AppNavTabs';

export const RuntimeMonitorPage: React.FC = () => {
  const {
    runtimeEvents,
    isMonitoring,
    monitorSpeed,
    toggleMonitoring,
    setMonitorSpeed,
    clearRuntimeEvents,
    triggerSimulatedProbe,
  } = useDeviceApp();

  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'suspicious' | 'normal'>('all');
  const [selectedAppFilter, setSelectedAppFilter] = useState<string>('all');

  const filteredEvents = runtimeEvents.filter((evt) => {
    if (severityFilter !== 'all' && evt.severity !== severityFilter) return false;
    if (selectedAppFilter !== 'all' && evt.appName !== selectedAppFilter) return false;
    return true;
  });

  // Unique app names for filter dropdown
  const uniqueApps = Array.from(new Set(runtimeEvents.map((e) => e.appName)));

  return (
    <div className="min-h-screen pb-20">
      <AppNavTabs />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 mb-2">
              <Activity className="w-3.5 h-3.5" />
              <span>Real-Time Behavior Engine</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Runtime Monitor
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Observe live background sensor queries, location checks, and ad telemetry transmissions as Android OS executes application processes.
            </p>
          </div>

          {/* Quick trigger simulation button */}
          <button
            type="button"
            onClick={() => triggerSimulatedProbe()}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-display flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all shrink-0"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Simulate Background Probe Now</span>
          </button>
        </div>

        {/* Live Telemetry Radar HUD */}
        <div className="p-6 rounded-3xl glass-panel border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            {/* Live Status Indicator & Pulse Radar */}
            <div className="flex items-center gap-5">
              <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <span className={`w-4 h-4 rounded-full ${isMonitoring ? 'bg-emerald-400 animate-ping opacity-75' : 'bg-slate-600'}`} />
                <span className={`absolute w-3 h-3 rounded-full ${isMonitoring ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-lg text-white">
                    {isMonitoring ? 'Live Telemetry Interceptor Active' : 'Monitor Paused'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${isMonitoring ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {isMonitoring ? 'Streaming' : 'Idle'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Filtering OS binder queries, content providers, and background network sockets.
                </p>
              </div>
            </div>

            {/* Stream Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={toggleMonitoring}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                  isMonitoring
                    ? 'bg-slate-900 text-amber-300 border-amber-500/30 hover:bg-slate-800'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {isMonitoring ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isMonitoring ? 'Pause Feed' : 'Resume Feed'}</span>
              </button>

              {/* Speed Buttons */}
              <div className="inline-flex rounded-xl bg-black/60 p-0.5 border border-white/10 text-xs">
                {[1, 2, 5].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setMonitorSpeed(speed)}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      monitorSpeed === speed
                        ? 'bg-cyan-500/30 text-cyan-300 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Clear Log */}
              <button
                type="button"
                onClick={clearRuntimeEvents}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-white/5 transition-colors"
                title="Clear Event Log"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl glass-panel border border-white/5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: 'All Events' },
                { id: 'critical', label: 'Critical' },
                { id: 'suspicious', label: 'Suspicious' },
                { id: 'normal', label: 'Normal / Benign' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSeverityFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  severityFilter === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter App:</span>
            <select
              value={selectedAppFilter}
              onChange={(e) => setSelectedAppFilter(e.target.value)}
              className="bg-slate-900/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Applications</option>
              {uniqueApps.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Streaming Event Feed Table */}
        <div className="rounded-2xl glass-panel border border-white/5 overflow-hidden">
          <div className="p-4 bg-slate-950/60 border-b border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Captured Telemetry Buffer ({filteredEvents.length} events)</span>
            <span>Real-time OS Hooks</span>
          </div>

          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No telemetry events logged matching the active filters.
              </div>
            ) : (
              filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 hover:bg-slate-900/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="font-mono text-cyan-400 text-[11px] shrink-0 pt-0.5">
                      {evt.timeFormatted}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-slate-100">
                          {evt.appName}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({evt.packageName})
                        </span>
                        {evt.isBackground && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Background
                          </span>
                        )}
                      </div>

                      <div className="text-slate-300 mt-1 font-medium">
                        {evt.action}: <code className="text-cyan-300 font-mono text-[11px] bg-slate-900 px-1 py-0.5 rounded">{evt.target}</code>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {evt.details}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold uppercase ${
                        evt.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : evt.severity === 'suspicious'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : evt.severity === 'auxiliary'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {evt.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
