import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HeartHandshake, EyeOff, ExternalLink } from 'lucide-react';
import { WORDING } from '../lib/wording';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/5 bg-[#02050c]/90 mt-20 text-slate-400 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span className="font-display font-bold text-white text-base">PrivacyGuard</span>
            </div>
            <p className="text-slate-400 max-w-md leading-relaxed text-xs sm:text-sm">
              {WORDING.subTagline}. {WORDING.oneSentence}
            </p>
            <div className="flex items-center gap-2 text-cyan-400/90 text-xs pt-1 font-mono">
              <EyeOff className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>Zero telemetry, zero advertising scripts, zero third-party trackers.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <div className="font-semibold text-slate-200 text-xs uppercase tracking-wider font-mono">
              Documentation
            </div>
            <ul className="space-y-1.5 text-xs sm:text-sm">
              <li>
                <Link to="/how-scoring-works" className="hover:text-cyan-300 transition-colors">
                  Scoring Methodology (50/10/10/10/10/5/5)
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-cyan-300 transition-colors">
                  Privacy Notice & Data Handling
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-cyan-300 transition-colors">
                  Cybercrime Help & Reporting (India)
                </Link>
              </li>
            </ul>
          </div>

          {/* Safety & Helplines */}
          <div className="space-y-2">
            <div className="font-semibold text-slate-200 text-xs uppercase tracking-wider font-mono">
              Safety Support
            </div>
            <ul className="space-y-1.5 text-xs sm:text-sm">
              <li>
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  National Cyber Crime Portal (India)
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li className="text-slate-400">
                Cyber Fraud Helpline: <span className="font-mono font-medium text-cyan-400">1930</span>
              </li>
              <li className="text-slate-500 text-[11px] pt-1">
                PrivacyGuard does not file legal complaints on behalf of users.
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p className="flex items-center gap-1.5 text-center sm:text-left">
            <HeartHandshake className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{WORDING.corePrinciple}</span>
          </p>
          <p className="font-mono text-[11px] text-slate-400">
            Static APK Analysis Engine • Built for User Sovereignty
          </p>
        </div>
      </div>
    </footer>
  );
};
