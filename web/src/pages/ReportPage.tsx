import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  RefreshCw, 
  Clock, 
  FileText, 
  AlertTriangle, 
  Smartphone, 
  CheckCircle2, 
  ChevronRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { apiClient } from '../api/client';
import type { AuditResult } from '../api/schema';
import { ScoreGauge } from '../components/ScoreGauge';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { ThreeLayerView } from '../components/ThreeLayerView';
import { PermissionTable } from '../components/PermissionTable';
import { DisclaimerFooter } from '../components/DisclaimerFooter';
import { useInstallPrompt } from '../context/InstallPromptContext';
import { APP_CATEGORIES } from '../lib/constants';
import { WORDING, getRiskBand } from '../lib/wording';

interface ReportPageProps {
  onScoreUpdate?: (score: number, riskColor: string) => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({ onScoreUpdate }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openInstallModal } = useInstallPrompt();

  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSha, setCopiedSha] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Notes');
  const [isReclassifying, setIsReclassifying] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    let isSubscribed = true;

    async function fetchReport() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await apiClient.getAudit(id);
        if (isSubscribed) {
          setAudit(data);
          setSelectedCategory(data.category);
          const risk = getRiskBand(data.score);
          if (onScoreUpdate) {
            onScoreUpdate(data.score, risk.color);
          }
        }
      } catch (err: unknown) {
        if (isSubscribed) {
          setError(err instanceof Error ? err.message : 'Report not found or expired.');
        }
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    fetchReport();
    return () => {
      isSubscribed = false;
    };
  }, [id, onScoreUpdate]);

  const copySha = () => {
    if (!audit?.app.apk_sha256) return;
    navigator.clipboard.writeText(audit.app.apk_sha256);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const handleReclassify = async () => {
    if (!audit || isReclassifying) return;
    try {
      setIsReclassifying(true);
      const updated = await apiClient.reclassify(audit.audit_id, selectedCategory);
      setAudit(updated);
    } catch (err) {
      console.error('Failed to reclassify category:', err);
    } finally {
      setIsReclassifying(false);
    }
  };

  const handleDelete = async () => {
    if (!audit || isDeleting) return;
    const confirmed = window.confirm('Are you sure you want to delete this report? This action is permanent.');
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await apiClient.deleteAudit(audit.audit_id);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete report:', err);
      setIsDeleting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!audit) return;
    const doc = new jsPDF();
    const risk = getRiskBand(audit.score);

    doc.setFontSize(22);
    doc.text('PrivacyGuard Audit Report', 14, 20);

    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date(audit.created_at).toLocaleDateString()} | Retained 7 Days`, 14, 28);
    doc.text(`Core Principle: "A permission request is a reason for review, never proof of malice."`, 14, 34);

    doc.setLineWidth(0.5);
    doc.line(14, 38, 196, 38);

    doc.setFontSize(14);
    doc.text(`Application: ${audit.app.app_name} (${audit.app.version_name})`, 14, 48);
    doc.setFontSize(10);
    doc.text(`Package: ${audit.app.package_name}`, 14, 55);
    doc.text(`SHA-256: ${audit.app.apk_sha256}`, 14, 62);
    doc.text(`Claim: "${audit.claim}"`, 14, 69);
    doc.text(`Category: ${audit.category} (Benchmark: ${audit.benchmark_sample_size} peer apps)`, 14, 76);

    doc.setFontSize(16);
    doc.text(`Privacy Risk Score: ${audit.score} / 100 (${risk.label})`, 14, 90);

    doc.setFontSize(11);
    doc.text('Forensic Breakdown:', 14, 102);
    let y = 110;
    audit.components.forEach((c) => {
      doc.text(`• ${c.name} (${c.weight}%): ${c.verified ? c.score + '/100' : 'Not Verified'}`, 18, y);
      y += 7;
    });

    y += 5;
    doc.text('Declared Permissions Summary:', 14, y);
    y += 8;
    audit.findings.forEach((f) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`• ${f.name} [${f.relevance.toUpperCase()}]: ${f.purpose} (Peer: ${f.benchmark_pct}%)`, 18, y);
      y += 8;
    });

    doc.save(`${audit.app.package_name || 'privacy'}-guard-report.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl border-2 border-cyan-400 border-t-transparent animate-spin" />
        <div className="text-sm font-mono text-cyan-300">Retrieving explainable privacy audit...</div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-display text-white">Report Not Found</h2>
        <p className="text-sm text-slate-400 max-w-md">
          {error || 'This report may have expired (7-day retention) or was deleted by the user.'}
        </p>
        <Link
          to="/"
          className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-cyan-500 hover:bg-cyan-400 text-black transition-colors"
        >
          Run a New Audit
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* 1. Report Header */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/20 text-left space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {audit.source}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Audited {new Date(audit.created_at).toLocaleDateString()} at {new Date(audit.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
              {audit.app.app_name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-300 font-mono">
              <span className="text-cyan-400">{audit.app.package_name}</span>
              <span className="text-slate-600">•</span>
              <span>v{audit.app.version_name}</span>
              <span className="text-slate-600">•</span>
              <span>SDK Min {audit.app.min_sdk} / Target {audit.app.target_sdk}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-2 rounded-xl border border-white/5 shrink-0">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Expires {new Date(audit.expires_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Copyable SHA-256 */}
        <div className="space-y-1.5">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
            APK SHA-256 Fingerprint
          </div>
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <code className="text-xs font-mono text-cyan-300 break-all select-all">
              {audit.app.apk_sha256}
            </code>
            <button
              type="button"
              onClick={copySha}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
              title="Copy SHA-256"
            >
              {copiedSha ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Score Gauge + Risk Label */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 text-center flex flex-col items-center justify-center">
        <ScoreGauge score={audit.score} riskLabel={audit.risk_label} size={240} />
      </div>

      {/* 3. "Why this score" Breakdown (Weights 50/10/10/10/10/5/5) */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10">
        <ScoreBreakdown components={audit.components} />
      </div>

      {/* 4. Three Cards: Claim vs Permissions vs Evidence */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10">
        <ThreeLayerView
          claim={audit.claim}
          category={audit.category}
          findings={audit.findings}
        />
      </div>

      {/* 5. Permission Table */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10">
        <PermissionTable findings={audit.findings} category={audit.category} />
      </div>

      {/* 6. Runtime Section: Not Verified Explanation */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-amber-500/20 text-left space-y-3 bg-gradient-to-r from-amber-950/15 via-slate-900/60 to-slate-900/60">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Runtime Behavior Status</span>
        </div>
        <p className="text-sm text-slate-200 font-medium">
          {audit.runtime_note}
        </p>
        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
          {WORDING.runtimeExplanation} Uploaded APKs are analyzed strictly statically without runtime emulation. To observe whether permissions are granted at runtime or if background services execute, inspect your device using the PrivacyGuard Android app.
        </p>
      </div>

      {/* 7. Actionable Recommendations */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 text-left space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-cyan-400" />
          <h3 className="font-display text-xl font-bold text-white">
            Recommended Precautions
          </h3>
        </div>
        <ul className="space-y-2.5">
          {audit.recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
              <span className="w-5 h-5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 8. Actions: Download PDF, Download JSON, Re-run category, Delete */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 text-left space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div>
            <h3 className="font-display text-lg font-bold text-white">Report Actions & Exports</h3>
            <p className="text-xs text-slate-400">Download report artifacts or re-calibrate category benchmarks.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={() => apiClient.exportJson(audit)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Report Now</span>
            </button>
          </div>
        </div>

        {/* Reclassify Category Option */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200">Re-run With Different Category</div>
            <div className="text-xs text-slate-400">Adjust the peer benchmark category to recalculate comparison deviation.</div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={isReclassifying}
              className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              {APP_CATEGORIES.filter((c: string) => c !== 'Auto-detect from claim').map((cat: string) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleReclassify}
              disabled={isReclassifying}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReclassifying ? 'animate-spin' : ''}`} />
              <span>Recalculate</span>
            </button>
          </div>
        </div>
      </div>

      {/* 9. Soft Install CTA CARD (Never an auto pop-up) */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-slate-900/80 to-violet-950/40 border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-left">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <Smartphone className="w-3.5 h-3.5" />
            <span>ON-DEVICE PROTECTION</span>
          </div>
          <h3 className="font-display text-2xl font-bold text-white">
            Want to check apps already on your phone?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Get the PrivacyGuard Android app. It scans your installed apps, provides a live permission dashboard, and notifies you when apps silently add new permissions during updates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openInstallModal('Installed App Scanner')}
          className="px-6 py-3.5 rounded-2xl font-display font-semibold text-sm sm:text-base bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all shrink-0 flex items-center gap-2 active:scale-95"
        >
          <span>Get the PrivacyGuard App</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 10. Footer Disclaimer & Score Bands */}
      <DisclaimerFooter
        scoreBands={audit.score_bands}
        benchmarkSampleSize={audit.benchmark_sample_size}
      />
    </div>
  );
};
