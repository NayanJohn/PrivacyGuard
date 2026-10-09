import React from 'react';
import { Database, ShieldAlert, HeartHandshake } from 'lucide-react';
import type { ScoreBand } from '../api/schema';
import { WORDING } from '../lib/wording';

interface DisclaimerFooterProps {
  scoreBands: ScoreBand[];
  benchmarkSampleSize: number;
}

export const DisclaimerFooter: React.FC<DisclaimerFooterProps> = ({
  scoreBands,
  benchmarkSampleSize,
}) => {
  return (
    <div className="w-full space-y-6 pt-6 border-t border-white/5 text-left">
      {/* Risk Band Reference Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            <span>Score Classification Thresholds</span>
          </h4>
          <span className="text-xs text-slate-400 font-mono">
            Scale: 0 (Least Concern) to 100 (Highest Review Need)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {scoreBands.map((band) => (
            <div
              key={band.label}
              className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-bold font-mono px-2 py-0.5 rounded"
                  style={{
                    color: band.color,
                    backgroundColor: `${band.color}15`,
                    borderColor: `${band.color}40`,
                  }}
                >
                  {band.min} – {band.max}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: band.color }}
                  aria-hidden="true"
                />
              </div>
              <div className="text-xs font-semibold text-slate-200">
                {band.label}
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {band.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Dataset Attribution & Core Principle */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-slate-300">
          <Database className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            Peer category baseline calculated across <strong className="text-white font-mono">{benchmarkSampleSize.toLocaleString()}</strong> verified Android packages.
          </span>
        </div>

        <div className="flex items-center gap-2 text-cyan-300/90 font-medium">
          <HeartHandshake className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{WORDING.corePrinciple}</span>
        </div>
      </div>
    </div>
  );
};
