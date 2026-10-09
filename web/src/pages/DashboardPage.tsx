import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Smartphone,
  AlertTriangle,
  UploadCloud,
  ChevronRight,
  Activity,
  HeartHandshake,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useDeviceApp } from '../context/DeviceAppContext';

export const DashboardPage: React.FC = () => {
  const {
    apps,
    alerts,
    user,
    overallDeviceScore,
    highRiskAppsCount,
    onboardUser,
    linkParent,
    verifyParent,
  } = useDeviceApp();

  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [onboardName, setOnboardName] = useState(user?.displayName || '');
  const [onboardAge, setOnboardAge] = useState<'adult' | 'minor'>(user?.ageCategory || 'adult');
  const [onboardDob, setOnboardDob] = useState(user?.dob || '');

  const [parentEmailInput, setParentEmailInput] = useState('');
  const [linkStatus, setLinkStatus] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [magicToken, setMagicToken] = useState<string | null>(null);

  // Compute risk distribution for Recharts
  const distributionData = [
    { name: 'Low (<30)', count: apps.filter((a) => a.riskScore < 30).length, color: '#10b981' },
    { name: 'Medium (30-54)', count: apps.filter((a) => a.riskScore >= 30 && a.riskScore < 55).length, color: '#3b82f6' },
    { name: 'High (55-79)', count: apps.filter((a) => a.riskScore >= 55 && a.riskScore < 80).length, color: '#f59e0b' },
    { name: 'Critical (80+)', count: apps.filter((a) => a.riskScore >= 80).length, color: '#ef4444' },
  ];

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardName.trim()) return;
    await onboardUser(onboardName, onboardAge, onboardDob);
    setOnboardModalOpen(false);
  };

  const handleLinkParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentEmailInput.trim()) return;
    try {
      const res = await linkParent(parentEmailInput);
      setLinkStatus('Verification code sent to parent.');
      setMagicToken(res.magic_token);
      if (res.verification_code_demo) {
        setDemoCode(res.verification_code_demo);
      }
    } catch (e: any) {
      setLinkStatus(e.message || 'Failed to send parent link.');
    }
  };

  const handleVerifyParentCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCodeInput.trim()) return;
    try {
      await verifyParent(verifyCodeInput, magicToken || undefined);
      setLinkStatus('Parental link verified! Real-time alerts enabled.');
    } catch (e: any) {
      setLinkStatus('Invalid verification code.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 min-h-[85vh]">
      {/* Top Banner / Account Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
              ACCOUNT & POSTURE CENTER
            </span>
            {user?.ageCategory === 'minor' && (
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-amber-500/10 text-amber-300 border border-amber-500/25">
                AGE: BELOW 18 (STUDENT)
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-white">
            {user ? `${user.displayName}'s Privacy Dashboard` : 'Device Privacy Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time audit overview, verified risk distribution, and parental safety status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setOnboardModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/10 text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>{user ? 'Update Profile & Age' : 'Set Age Category'}</span>
          </button>

          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all shadow-lg shadow-cyan-900/20 flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Audit New APK</span>
          </Link>
        </div>
      </div>

      {/* Under-18 Parental Link Card (if user is minor) */}
      {user?.ageCategory === 'minor' && (
        <div className="p-6 rounded-3xl bg-amber-950/20 border border-amber-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Parental Safety Connection</h3>
                <p className="text-xs text-slate-300">
                  {user.parentLinked
                    ? `Linked to parent: ${user.parentEmail || 'Verified'} (Parental alerts enabled for audit score >= 80)`
                    : 'Under-18 accounts require linking a parent Gmail before live monitoring.'}
                </p>
              </div>
            </div>

            {user.parentLinked && magicToken && (
              <Link
                to={`/parent/portal/${magicToken}`}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <span>View Parent Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {!user.parentLinked && (
            <div className="pt-2 border-t border-amber-500/20 space-y-3">
              {!demoCode ? (
                <form onSubmit={handleLinkParentSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
                  <input
                    type="email"
                    value={parentEmailInput}
                    onChange={(e) => setParentEmailInput(e.target.value)}
                    placeholder="Enter parent's Gmail address..."
                    required
                    className="flex-grow px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs whitespace-nowrap transition-colors"
                  >
                    Send Verification Code
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyParentCode} className="flex flex-col sm:flex-row gap-3 max-w-lg items-center">
                  <span className="text-xs font-mono text-amber-300">Demo Code: {demoCode}</span>
                  <input
                    type="text"
                    value={verifyCodeInput}
                    onChange={(e) => setVerifyCodeInput(e.target.value)}
                    placeholder="Enter 6-digit code..."
                    className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-36"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs whitespace-nowrap transition-colors"
                  >
                    Confirm Consent
                  </button>
                </form>
              )}
              {linkStatus && <p className="text-xs font-mono text-cyan-300">{linkStatus}</p>}
            </div>
          )}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>DEVICE PRIVACY HEALTH</span>
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{overallDeviceScore} / 100</div>
          <p className="text-[11px] text-slate-400">
            {apps.length === 0 ? 'No apps scanned yet' : `Averaged across ${apps.length} audited package(s)`}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>AUDITED APPLICATIONS</span>
            <Smartphone className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{apps.length}</div>
          <p className="text-[11px] text-slate-400">Real APK packages parsed</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>HIGH CONCERN APPS</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-rose-400">{highRiskAppsCount}</div>
          <p className="text-[11px] text-slate-400">Score &ge; 80 / 100</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>ACTIVE ALERTS</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{alerts.length}</div>
          <p className="text-[11px] text-slate-400">Threshold violations logged</p>
        </div>
      </div>

      {/* Main Content: Risk Chart + App List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Risk Distribution */}
        <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/60 border border-white/5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Audited Risk Distribution</h3>
            <p className="text-xs text-slate-400">Real distribution across severity bands</p>
          </div>

          {apps.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 font-mono space-y-2">
              <Shield className="w-8 h-8 mx-auto text-slate-600" />
              <span>No apps scanned yet to render distribution chart.</span>
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="text-[11px] text-slate-400 border-t border-white/5 pt-3">
            Scores derived from 3-component weighted blend: 0.40 ML + 0.35 static + 0.25 heuristic.
          </div>
        </div>

        {/* Real Audited Apps List / Proper Empty State */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/60 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Audited Applications ({apps.length})</h3>
              <p className="text-xs text-slate-400">Real packages processed by PrivacyGuard engine</p>
            </div>

            <Link
              to="/apps"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {apps.length === 0 ? (
            /* Absolute Rule: Proper Empty State, NO Mock Placeholders */
            <div className="py-16 text-center space-y-4 rounded-2xl bg-slate-950/40 border border-dashed border-white/10 p-8">
              <Smartphone className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="font-bold text-white text-base">No apps scanned yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No apps scanned yet. Upload an APK or install the Android app to begin explainable privacy monitoring.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <Link
                  to="/"
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload an APK</span>
                </Link>
                <Link
                  to="/search"
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-white/10 transition-colors"
                >
                  <span>Search App Registry</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {apps.slice(0, 5).map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${app.iconBg} ${app.iconColor} flex items-center justify-center font-bold font-mono text-sm shrink-0`}>
                      {app.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{app.name}</h4>
                      <p className="text-[11px] font-mono text-slate-400 truncate">{app.packageName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono ${
                      app.riskScore >= 80 ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                      app.riskScore >= 55 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {app.riskScore} / 100
                    </span>

                    <Link
                      to={`/report/${app.id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-white/10 transition-colors"
                    >
                      Report
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Onboarding / Age Settings Modal */}
      {onboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-cyan-500/30 shadow-2xl space-y-5">
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-white">Age Category & Onboarding</h3>
              <p className="text-xs text-slate-400">
                Self-declared category determines whether parental safety linking is required.
              </p>
            </div>

            <form onSubmit={handleSaveOnboarding} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Display Name</label>
                <input
                  type="text"
                  value={onboardName}
                  onChange={(e) => setOnboardName(e.target.value)}
                  placeholder="e.g. Alex"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Age Category</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboardAge('adult')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      onboardAge === 'adult'
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-slate-800 border-white/10 text-slate-400'
                    }`}
                  >
                    18 and above
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardAge('minor')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      onboardAge === 'minor'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-slate-800 border-white/10 text-slate-400'
                    }`}
                  >
                    Below 18
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Date of Birth (Optional)</label>
                <input
                  type="date"
                  value={onboardDob}
                  onChange={(e) => setOnboardDob(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
