import React from 'react';
import { Sliders, Shield, AlertTriangle, Layers, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DEFAULT_SCORE_BANDS } from '../api/client';
import { RELEVANCE_MAP, EVIDENCE_LABELS, WORDING } from '../lib/wording';
import { RelevanceBadge, EvidenceBadge } from '../components/EvidenceBadge';

export const MethodologyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 text-left space-y-12">
      {/* Page Title */}
      <div className="space-y-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to APK Audit</span>
        </Link>
        <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          How Scoring Works
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
          PrivacyGuard provides transparent, explainable privacy risk scores calculated strictly from static APK inspection and category peer benchmarks.
        </p>
      </div>

      {/* Core Rule Callout */}
      <div className="p-5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-4">
        <Shield className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-semibold text-sm sm:text-base text-white">
            Core Analytical Principle
          </h3>
          <p className="text-xs sm:text-sm text-cyan-200/90 leading-relaxed">
            {WORDING.corePrinciple} PrivacyGuard explains declared permissions and highlights statistical anomalies, but does not claim proof of malicious intent.
          </p>
        </div>
      </div>

      {/* 1. Component Weight Breakdown Table */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            1. Seven-Factor Weight Matrix (50 / 10 / 10 / 10 / 10 / 5 / 5)
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">
          Each component evaluates a distinct static analysis vector. When runtime components are unavailable (Not Verified), weights are proportionately renormalized.
        </p>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/80 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="p-3.5">Component</th>
                <th className="p-3.5">Weight</th>
                <th className="p-3.5">Static Status</th>
                <th className="p-3.5">Evaluation Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              <tr>
                <td className="p-3.5 font-semibold text-white">Claim-to-Permission Divergence</td>
                <td className="p-3.5 font-mono text-cyan-400 font-bold">50%</td>
                <td className="p-3.5"><span className="text-emerald-400 font-mono text-xs">Verified</span></td>
                <td className="p-3.5 text-xs text-slate-400">Natural language analysis comparing stated app functionality with declared low-level permissions.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-white">Peer Category Benchmark Deviation</td>
                <td className="p-3.5 font-mono text-cyan-400 font-bold">10%</td>
                <td className="p-3.5"><span className="text-emerald-400 font-mono text-xs">Verified</span></td>
                <td className="p-3.5 text-xs text-slate-400">Prevalence compared to 4,280+ peer apps in the same store category.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-white">Sensitive Data Scope</td>
                <td className="p-3.5 font-mono text-cyan-400 font-bold">10%</td>
                <td className="p-3.5"><span className="text-emerald-400 font-mono text-xs">Verified</span></td>
                <td className="p-3.5 text-xs text-slate-400">Broad permissions (e.g. FINE_LOCATION vs COARSE_LOCATION, READ_EXTERNAL_STORAGE vs Photo Picker).</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-white">Third-Party SDK Surface</td>
                <td className="p-3.5 font-mono text-cyan-400 font-bold">10%</td>
                <td className="p-3.5"><span className="text-emerald-400 font-mono text-xs">Verified</span></td>
                <td className="p-3.5 text-xs text-slate-400">Embedded analytics, ad exchanges, and behavioral profiling trackers in APK bytecode.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-white">Background Service Exposure</td>
                <td className="p-3.5 font-mono text-cyan-400 font-bold">10%</td>
                <td className="p-3.5"><span className="text-emerald-400 font-mono text-xs">Verified</span></td>
                <td className="p-3.5 text-xs text-slate-400">Boot receivers (BOOT_COMPLETED), foreground service types, and wake lock declarations.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-white">Hardware Sensor Exposure</td>
                <td className="p-3.5 font-mono text-cyan-400 font-bold">5%</td>
                <td className="p-3.5"><span className="text-emerald-400 font-mono text-xs">Verified</span></td>
                <td className="p-3.5 text-xs text-slate-400">Biometric, raw microphone, and camera sensor flags.</td>
              </tr>
              <tr className="bg-slate-950/50">
                <td className="p-3.5 font-semibold text-slate-400">Runtime Dynamic Behavior</td>
                <td className="p-3.5 font-mono text-slate-500 font-bold">5%</td>
                <td className="p-3.5"><span className="text-amber-400 font-mono text-xs">Not Verified</span></td>
                <td className="p-3.5 text-xs text-slate-500 italic">Excluded from web audits. Available exclusively in the PrivacyGuard Android on-device app.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Four Relevance Classes */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-400" />
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
            2. Four Permission Relevance Classes
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.keys(RELEVANCE_MAP) as Array<keyof typeof RELEVANCE_MAP>).map((key) => {
            const item = RELEVANCE_MAP[key];
            return (
              <div key={key} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <RelevanceBadge level={key} />
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Three Evidence Labels */}
      <section className="space-y-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
          3. Three Evidence Confidence Labels
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.keys(EVIDENCE_LABELS) as Array<keyof typeof EVIDENCE_LABELS>).map((key) => {
            const item = EVIDENCE_LABELS[key];
            return (
              <div key={key} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <EvidenceBadge type={key} />
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Score Classification Bands */}
      <section className="space-y-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
          4. Score Classification Thresholds
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DEFAULT_SCORE_BANDS.map((band) => (
            <div key={band.label} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm" style={{ color: band.color }}>
                  {band.label}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {band.min} – {band.max}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {band.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Static Analysis Limitations */}
      <section className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 space-y-3">
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span>Static Analysis Limitations</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Static analysis inspects decompiled assets and manifests without executing byte-code. It cannot monitor network packets, observe whether an app actually prompts for runtime permissions on your phone, or detect dynamically downloaded DEX payloads. To monitor actual device grants, use the PrivacyGuard Android application.
        </p>
      </section>
    </div>
  );
};
