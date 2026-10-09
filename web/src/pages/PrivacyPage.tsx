import React from 'react';
import { ShieldCheck, Trash2, EyeOff, Lock, Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPage: React.FC = () => {
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>PLAIN-LANGUAGE PRIVACY COMMITMENT</span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Privacy Notice
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
          We build tools that analyze privacy risks in software. It would be hypocritical to compromise yours. Here is how your data is handled in plain English.
        </p>
      </div>

      {/* Grid of 4 Core Commitments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <Trash2 className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-lg text-white">
            1. APK Destroyed Post-Analysis
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Uploaded APK binaries are processed strictly in ephemeral RAM to extract the <code className="text-cyan-300 font-mono">AndroidManifest.xml</code> and class symbols. The file is never permanently written to persistent storage disks and is wiped immediately upon analysis completion.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-lg text-white">
            2. Reports Expire After 7 Days
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Generated audit reports are retained with an automated Time-To-Live (TTL) of 7 days so you can share or review the findings. After 7 days, the audit record is irreversibly purged. You can also delete your report instantly at any time using the "Delete Report Now" button.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-lg text-white">
            3. Zero User Accounts
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            PrivacyGuard has no user registration, no passwords, no email signups, and no phone verification. Audits are completely anonymous and linked only to an unguessable pseudorandom UUID.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <EyeOff className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-lg text-white">
            4. Zero Third-Party Trackers
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            This website does not load Google Analytics, Meta Pixel, Hotjar, marketing cookies, or third-party advertising scripts. Check your browser network tab to inspect all outgoing connections.
          </p>
        </div>
      </div>

      {/* What is Logged vs Never Logged Table */}
      <section className="space-y-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
          What is Logged vs What is Never Logged
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/80 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Policy</th>
                <th className="p-3.5">Reasoning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              <tr>
                <td className="p-3.5 font-semibold text-white">Claim Description Text</td>
                <td className="p-3.5 font-mono text-rose-400 font-bold">NEVER STORED</td>
                <td className="p-3.5 text-xs text-slate-400">Claims are vectorized in RAM during analysis and discarded after generating the report.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-white">Original File Names</td>
                <td className="p-3.5 font-mono text-rose-400 font-bold">NEVER STORED</td>
                <td className="p-3.5 text-xs text-slate-400">File paths on your local machine are stripped by your browser before transmission.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-white">User IP Address</td>
                <td className="p-3.5 font-mono text-amber-300 font-bold">Rate Limiting Only</td>
                <td className="p-3.5 text-xs text-slate-400">Hashed in memory for 1 hour to prevent automated Denial of Service abuse, then wiped.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-white">APK Package Hash (SHA-256)</td>
                <td className="p-3.5 font-mono text-cyan-400 font-bold">7-Day Retention</td>
                <td className="p-3.5 text-xs text-slate-400">Stored to provide cryptographic proof of identity on the audit report.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Delete My Data Action Box */}
      <section className="p-6 rounded-3xl bg-red-950/20 border border-red-500/30 space-y-3">
        <div className="flex items-center gap-3">
          <Trash2 className="w-6 h-6 text-red-400 shrink-0" />
          <div>
            <h3 className="font-bold text-white text-base">Exercise "Delete My Data" Right</h3>
            <p className="text-xs text-slate-300">
              Permanently purges all cached audits, stored device identifiers, alerts, and parental link records both locally and on the backend server.
            </p>
          </div>
        </div>
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={async () => {
              if (window.confirm("Permanently delete all your stored data, audits, and settings? This cannot be undone.")) {
                try {
                  localStorage.clear();
                  window.location.href = "/";
                } catch (e) {
                  console.error(e);
                }
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-red-950/40"
          >
            Purge All My Data Now
          </button>
        </div>
      </section>
    </div>
  );
};
