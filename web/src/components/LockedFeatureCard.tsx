import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { type LockedFeatureInfo } from '../lib/constants';

const FEATURE_ROUTES: Record<string, string> = {
  'My Applications': '/apps',
  'Permission Dashboard': '/permissions',
  'Alerts': '/alerts',
  'History': '/history',
  'Runtime Monitor': '/runtime',
};

export const LockedFeatureCard: React.FC<{ feature: LockedFeatureInfo }> = ({ feature }) => {
  const Icon = feature.icon;
  const targetRoute = FEATURE_ROUTES[feature.title] || '/app';

  return (
    <Link
      to={targetRoute}
      aria-label={`${feature.title}, open interactive on-device feature`}
      className="group relative text-left w-full h-full p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/5 hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_30px_-10px_rgba(6,182,212,0.25)] flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
    >
      {/* Top row */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-105 group-hover:border-cyan-400 transition-all">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-mono text-cyan-300">
            <Sparkles className="w-3 h-3 text-cyan-400" aria-hidden="true" />
            <span>App Feature</span>
          </div>
        </div>

        <h4 className="font-display font-bold text-base sm:text-lg text-white group-hover:text-cyan-300 transition-colors">
          {feature.title}
        </h4>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
          {feature.summary}
        </p>
      </div>

      {/* Card Footer */}
      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400 group-hover:text-cyan-400 transition-colors">
        <span>{feature.tag}</span>
        <span className="font-semibold underline underline-offset-4 flex items-center gap-1">
          Open Feature <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
};
