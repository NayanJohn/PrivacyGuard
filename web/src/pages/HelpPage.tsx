import React from 'react';
import { ExternalLink, PhoneCall, ShieldAlert, LifeBuoy, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HelpPage: React.FC = () => {
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
          <LifeBuoy className="w-3.5 h-3.5" />
          <span>PUBLIC SAFETY DIRECTORY (FREE & UNRESTRICTED)</span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Help Center & Reporting
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
          Guidance on identifying suspicious Android applications, preserving forensic evidence, and official reporting channels.
        </p>
      </div>

      {/* Official Government Helplines (India) */}
      <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-slate-950 border border-cyan-500/30 space-y-6">
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            Official Government Channels • India
          </div>
          <h2 className="font-display text-2xl font-bold text-white">
            National Cyber Crime Reporting Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            If you suspect financial fraud, identity theft, or unauthorized surveillance originating from an installed mobile application, file an official grievance with law enforcement agencies directly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Toll-Free Helpline */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-slate-400 font-mono">Toll-Free National Helpline</div>
              <div className="text-2xl sm:text-3xl font-display font-extrabold text-cyan-400">
                1930
              </div>
              <div className="text-[11px] text-slate-400">
                Citizen Financial Cyber Fraud Reporting
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <PhoneCall className="w-6 h-6" />
            </div>
          </div>

          {/* Web Portal Link */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="text-xs text-slate-400 font-mono">Official Web Portal</div>
              <div className="text-lg font-bold text-white">cybercrime.gov.in</div>
              <div className="text-[11px] text-slate-400">
                Ministry of Home Affairs, Government of India
              </div>
            </div>
            <div className="pt-3">
              <a
                href="https://cybercrime.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline"
              >
                <span>Visit National Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Clear Legal Disclaimer */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 text-xs text-slate-400 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            <strong>Important Notice:</strong> PrivacyGuard is an automated forensic inspection and educational tool. PrivacyGuard does <em>not</em> file legal complaints, contact authorities, or represent users in legal proceedings on your behalf.
          </span>
        </div>
      </section>

      {/* Steps to Take */}
      <section className="space-y-6">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
          What To Do If An App Raises Severe Privacy Concerns
        </h2>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
            <div className="font-semibold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-mono flex items-center justify-center">1</span>
              <span>Revoke Permissions Immediately</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-8">
              Navigate to your phone's <em>Settings &rarr; Apps &rarr; [App Name] &rarr; Permissions</em>. Toggle off sensitive permissions including <strong>Camera</strong>, <strong>Microphone</strong>, <strong>Location</strong>, and <strong>Contacts</strong>.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
            <div className="font-semibold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-mono flex items-center justify-center">2</span>
              <span>Preserve Forensic Evidence</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-8">
              Before uninstalling the application, preserve records if financial harm is suspected:
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-slate-400 pl-8 space-y-1">
              <li>Download the <strong>PrivacyGuard PDF Audit Report</strong> with the exact APK SHA-256 fingerprint.</li>
              <li>Take full-screen screenshots of unauthorized SMS access or suspicious payment screens.</li>
              <li>Record bank statement reference numbers for any unauthorized debit entries.</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
            <div className="font-semibold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-mono flex items-center justify-center">3</span>
              <span>Safely Uninstall the Package</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-8">
              Uninstall the APK package from Android Settings. Restart your smartphone to terminate any persistent background processes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
