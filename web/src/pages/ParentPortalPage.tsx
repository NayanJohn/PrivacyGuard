import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, EyeOff, FileText, ArrowRight, Loader2, HeartHandshake } from 'lucide-react';
import { apiClient } from '../api/client';
import type { ParentPortalData } from '../api/schema';

export const ParentPortalPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ParentPortalData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing parent portal access token.');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.getParentPortal(token);
        setData(res);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Invalid or expired magic link. Please request a new link from your child.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-4 text-center">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        <h2 className="text-xl font-bold text-white">Loading Parent Safety Portal...</h2>
        <p className="text-sm text-slate-400 font-mono">Verifying secure magic access token</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-5 px-4 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-white">Unable to Open Portal</h2>
        <p className="text-sm text-slate-300">{error || 'Access token is invalid or expired.'}</p>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/10 text-sm font-semibold transition-colors"
        >
          Return to PrivacyGuard Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Portal Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-cyan-500/30 backdrop-blur-xl space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Parental Link</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Parent Safety Portal: {data.child_name}
              </h1>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 font-mono">Linked Parent Email</span>
            <p className="text-sm font-semibold text-white font-mono">{data.parent_email}</p>
          </div>
        </div>

        {/* Transparent Consent Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>What Is Shared With You</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
              <li>App name and package identifier</li>
              <li>Overall explainable risk score (0-100) & severity</li>
              <li>Top flagged risk factors in plain English</li>
              <li>Hardware permission requests (Camera, Mic, GPS)</li>
              <li>Timestamp of detection or audit</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <EyeOff className="w-4 h-4 shrink-0" />
              <span>What Is Strictly NOT Shared (Protected)</span>
            </div>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Personal text messages and chats</li>
              <li>Camera photos or video files</li>
              <li>Web browsing history or search logs</li>
              <li>App screen contents or keystrokes</li>
              <li>Historical physical location history</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Safety Alerts Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>High-Risk Safety Alerts ({data.alerts.length})</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Auto-generated when audit score &ge; 80</span>
        </div>

        {data.alerts.length === 0 ? (
          <div className="p-10 rounded-3xl bg-slate-900/40 border border-white/5 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-semibold text-white">No Critical Alerts Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your child has not installed or audited applications exceeding the risk threshold (80/100). All monitored software falls within acceptable privacy guidelines.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      {alert.severity} ({alert.score}/100)
                    </span>
                    <h3 className="font-bold text-white text-base">{alert.app_name}</h3>
                    <span className="text-xs font-mono text-slate-400">({alert.package_name})</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300">{alert.message}</p>
                  <span className="text-[11px] font-mono text-slate-400">
                    Detected: {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>

                {alert.scan_id && (
                  <Link
                    to={`/report/${alert.scan_id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs whitespace-nowrap transition-colors"
                  >
                    <span>View Audit Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Reports History */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          <span>Full Application Audit Reports ({data.reports.length})</span>
        </h2>

        {data.reports.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center text-xs text-slate-400">
            No full reports available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.reports.map((report: any) => (
              <div
                key={report.audit_id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-base">{report.app?.app_name || 'Audited App'}</h4>
                    <p className="text-xs font-mono text-slate-400">{report.app?.package_name}</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono ${
                    report.score >= 80 ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                    report.score >= 55 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {report.score} / 100
                  </div>
                </div>

                <div className="text-xs text-slate-300">
                  Category: <strong>{report.category}</strong> | Tested: {new Date(report.created_at).toLocaleDateString()}
                </div>

                <Link
                  to={`/report/${report.audit_id}`}
                  className="inline-flex items-center gap-1 text-xs font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
                >
                  <span>Open Full Interactive Report &rarr;</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
