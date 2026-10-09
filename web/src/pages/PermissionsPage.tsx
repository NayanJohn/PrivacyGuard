import React, { useState } from 'react';
import {
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useDeviceApp } from '../context/DeviceAppContext';
import { AppNavTabs } from '../components/AppNavTabs';
import { AppIcon } from '../components/AppIcon';
import { PERMISSION_GROUPS_CATALOG } from '../data/permissionCatalog';

export const PermissionsPage: React.FC = () => {
  const { apps, toggleAppPermission } = useDeviceApp();
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>('location');

  const selectedGroup = PERMISSION_GROUPS_CATALOG.find((g) => g.key === selectedGroupKey) || PERMISSION_GROUPS_CATALOG[0];

  // Find all apps requesting this permission
  const appsWithGroup = apps.filter((app) =>
    app.permissions.some((p) => p.category === selectedGroupKey)
  );

  return (
    <div className="min-h-screen pb-20">
      <AppNavTabs />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Android Permission Matrix</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Permission Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audit which sensitive hardware sensors and personal data databases applications have been granted on this device.
          </p>
        </div>

        {/* 8 Permission Group Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {PERMISSION_GROUPS_CATALOG.map((group) => {
            const isSelected = group.key === selectedGroupKey;
            // Count granted apps dynamically
            const grantedCount = apps.filter((a) =>
              a.permissions.some((p) => p.category === group.key && p.grantStatus !== 'denied')
            ).length;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupKey(group.key)}
                className={`p-3.5 rounded-2xl text-left transition-all duration-200 flex flex-col justify-between border ${
                  isSelected
                    ? 'bg-gradient-to-b from-cyan-950/80 to-slate-900 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                    : 'glass-panel border-white/5 hover:border-cyan-500/30'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}>
                      <AppIcon name={group.iconName} className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full uppercase ${
                        group.dangerLevel === 'critical'
                          ? 'bg-rose-500/20 text-rose-300'
                          : group.dangerLevel === 'high'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {group.dangerLevel}
                    </span>
                  </div>

                  <div className="font-display font-semibold text-xs text-white truncate">
                    {group.name}
                  </div>
                </div>

                <div className="mt-3 text-[11px] font-mono text-slate-400">
                  <span className={grantedCount > 0 ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                    {grantedCount}
                  </span> granted
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Permission Group Deep Dive */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Group Specification */}
          <div className="p-6 rounded-2xl glass-panel border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                <AppIcon name={selectedGroup.iconName} className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white">
                  {selectedGroup.name}
                </h2>
                <span className="text-xs font-mono text-cyan-400">
                  Android Category: {selectedGroup.category}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {selectedGroup.description}
            </p>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Sensitivity Weight:</span>
                <span className="font-mono text-white capitalize font-semibold">{selectedGroup.dangerLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Apps Requesting:</span>
                <span className="font-mono text-cyan-300 font-semibold">{appsWithGroup.length} apps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Background Exposure:</span>
                <span className="font-mono text-amber-300 font-semibold">{selectedGroup.backgroundAccessApps} apps</span>
              </div>
            </div>

            {/* Least Privilege Principle tip */}
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                <Info className="w-3.5 h-3.5" />
                <span>Least Privilege Rule</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Applications should only be granted sensitive sensors while actively in the foreground unless continuous navigation or background sync is essential.
              </p>
            </div>
          </div>

          {/* Right Column: Applications List with Quick Grant Toggles */}
          <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-white">
                Applications Requesting {selectedGroup.name} ({appsWithGroup.length})
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Toggle grant state to adjust risk
              </span>
            </div>

            <div className="space-y-3">
              {appsWithGroup.length === 0 ? (
                <div className="p-8 text-center glass-panel rounded-2xl border border-white/5 text-slate-400 text-xs">
                  No installed applications currently request this permission.
                </div>
              ) : (
                appsWithGroup.map((app) => {
                  const perm = app.permissions.find((p) => p.category === selectedGroupKey);
                  if (!perm) return null;

                  return (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-cyan-500/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl ${app.iconBg} ${app.iconColor} border border-white/10 flex items-center justify-center shrink-0`}>
                          <AppIcon name={app.iconName} className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-sm text-white truncate">
                              {app.name}
                            </span>
                            {!perm.justified ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Unjustified
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Claim Justified
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {perm.purposeNote}
                          </p>
                          <div className="text-[11px] font-mono text-cyan-400 mt-1">
                            Peer adoption: {perm.benchmarkPeerAdoption}% • App Risk: {app.riskScore}/100
                          </div>
                        </div>
                      </div>

                      {/* Interactive Grant Status Toggles */}
                      <div className="inline-flex rounded-xl bg-black/60 p-1 border border-white/10 text-xs shrink-0 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => toggleAppPermission(app.id, perm.id, 'granted')}
                          className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                            perm.grantStatus === 'granted'
                              ? 'bg-emerald-500/30 text-emerald-300 font-bold shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Granted
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAppPermission(app.id, perm.id, 'while_in_use')}
                          className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                            perm.grantStatus === 'while_in_use'
                              ? 'bg-cyan-500/30 text-cyan-300 font-bold shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          In-Use Only
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAppPermission(app.id, perm.id, 'denied')}
                          className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                            perm.grantStatus === 'denied'
                              ? 'bg-rose-500/30 text-rose-300 font-bold shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Revoked
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
