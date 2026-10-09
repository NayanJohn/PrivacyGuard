import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Smartphone, Menu, X, Sparkles, Download } from 'lucide-react';
import { useInstallPrompt } from '../context/InstallPromptContext';
import { useDeviceApp } from '../context/DeviceAppContext';
import { PwaInstallBanner } from './PwaInstallBanner';
import { WORDING } from '../lib/wording';

const APP_NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/search', label: 'Search' },
  { path: '/apps', label: 'My Apps' },
  { path: '/permissions', label: 'Permissions' },
  { path: '/runtime', label: 'Runtime' },
  { path: '/alerts', label: 'Alerts' },
  { path: '/history', label: 'History' },
];

export const Header: React.FC = () => {
  const { openInstallModal } = useInstallPrompt();
  const { unresolvedAlertsCount, isMonitoring } = useDeviceApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isAppSection = ['/app', '/apps', '/permissions', '/runtime', '/alerts', '/history'].some(
    (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)
  );

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#030712]/85 border-b border-white/5 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Tagline */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg p-1 shrink-0"
          >
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.25)] group-hover:border-cyan-400 transition-all">
              <Shield className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 rounded-xl bg-cyan-400/10 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                PrivacyGuard
                <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {isAppSection ? 'App Suite' : 'Web Audit'}
                </span>
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline font-normal">
                {WORDING.tagline}
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Main Navigation">
            {/* Top Switcher: Web APK Audit vs PrivacyGuard App Suite */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10 mr-2">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  location.pathname === '/' || location.pathname.startsWith('/report/')
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                APK Audit
              </Link>
              <Link
                to="/app"
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isAppSection
                    ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>App Suite</span>
              </Link>
            </div>

            {/* In-App Feature Quick Links */}
            <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5 mr-2">
              {APP_NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      isActive
                        ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-500/30'
                        : 'text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 border border-transparent'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.path === '/alerts' && unresolvedAlertsCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    )}
                    {item.path === '/runtime' && isMonitoring && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Standard Pages */}
            <Link
              to="/how-scoring-works"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                location.pathname === '/how-scoring-works'
                  ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Methodology
            </Link>
            <Link
              to="/help"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                location.pathname === '/help'
                  ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Help
            </Link>

            {/* Install PWA Button */}
            <div className="ml-2">
              <PwaInstallBanner variant="button" />
            </div>

            {/* Native APK Download Trigger */}
            <button
              type="button"
              onClick={(e) => openInstallModal('Download Android APK', e.currentTarget)}
              className="ml-1 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Download standalone APK file"
            >
              <Download className="w-4 h-4" />
            </button>
          </nav>

          {/* Mobile hamburger menu toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <PwaInstallBanner variant="button" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-800 bg-[#060b17]/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3">
          <div className="text-xs uppercase font-mono tracking-wider text-slate-400 px-2 py-1">
            PrivacyGuard App Suite
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/app"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-500/30"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>App Overview</span>
            </Link>
            {APP_NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900/80 border border-slate-800 hover:border-cyan-500/30"
              >
                <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-3 space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Web APK Audit
            </Link>
            <Link
              to="/how-scoring-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Methodology
            </Link>
            <Link
              to="/help"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Help Center
            </Link>
          </div>

          <button
            type="button"
            onClick={(e) => {
              setMobileMenuOpen(false);
              openInstallModal('Download Android APK', e.currentTarget);
            }}
            className="w-full mt-2 py-2.5 rounded-xl text-center text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Standalone Android APK</span>
          </button>
        </div>
      )}
    </header>
  );
};
