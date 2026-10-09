import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Smartphone, ShieldCheck, Activity, Bell, History, Sparkles } from 'lucide-react';
import { useDeviceApp } from '../context/DeviceAppContext';

export const AppNavTabs: React.FC = () => {
  const { unresolvedAlertsCount, isMonitoring } = useDeviceApp();

  const links = [
    { to: '/app', label: 'Overview', icon: LayoutDashboard, exact: true },
    { to: '/apps', label: 'My Applications', icon: Smartphone },
    { to: '/permissions', label: 'Permission Matrix', icon: ShieldCheck },
    {
      to: '/runtime',
      label: 'Runtime Monitor',
      icon: Activity,
      badge: isMonitoring ? (
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live stream active" />
      ) : null,
    },
    {
      to: '/alerts',
      label: 'Alerts',
      icon: Bell,
      count: unresolvedAlertsCount > 0 ? unresolvedAlertsCount : null,
    },
    { to: '/history', label: 'Version Drift', icon: History },
  ];

  return (
    <div className="w-full border-b border-white/5 bg-slate-950/60 backdrop-blur-md sticky top-16 sm:top-20 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5 overflow-x-auto no-scrollbar gap-2">
          {/* Section Indicator */}
          <div className="hidden md:flex items-center gap-2 pl-1 pr-3 border-r border-white/10 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Sparkles className="w-3 h-3" />
              On-Device Suite
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2 flex-grow">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.exact}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                  {link.badge}
                  {link.count !== null && link.count !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-white">
                      {link.count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};
