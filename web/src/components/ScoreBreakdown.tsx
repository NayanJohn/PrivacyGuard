import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, ShieldQuestion } from 'lucide-react';
import type { ScoreComponent } from '../api/schema';

interface ScoreBreakdownProps {
  components: ScoreComponent[];
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ components }) => {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({ 0: true });

  const toggleExpand = (idx: number) => {
    setExpandedIndices((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  return (
    <div className="w-full space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
        <div>
          <h3 className="text-lg sm:text-xl font-bold font-display text-white">
            Why this score?
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Weighted forensic breakdown across 7 static analysis components (50 / 10 / 10 / 10 / 10 / 5 / 5).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const allExpanded = Object.keys(expandedIndices).length === components.length;
            if (allExpanded) {
              setExpandedIndices({});
            } else {
              const all: Record<number, boolean> = {};
              components.forEach((_, i) => (all[i] = true));
              setExpandedIndices(all);
            }
          }}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-mono self-start sm:self-auto"
        >
          {Object.keys(expandedIndices).length === components.length ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      <div className="space-y-3">
        {components.map((comp, idx) => {
          const isExpanded = !!expandedIndices[idx];

          return (
            <div
              key={comp.name}
              className={`rounded-2xl border transition-all ${
                comp.verified
                  ? isExpanded
                    ? 'bg-slate-900/90 border-cyan-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                    : 'bg-slate-900/50 border-white/5 hover:border-white/10'
                  : 'bg-slate-950/40 border-dashed border-slate-700/60 opacity-85'
              }`}
            >
              {/* Row Header / Toggle Button */}
              <button
                type="button"
                onClick={() => toggleExpand(idx)}
                aria-expanded={isExpanded}
                className="w-full p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-2xl"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm sm:text-base text-slate-100">
                      {comp.name}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
                      Weight: {comp.weight}%
                    </span>
                    {!comp.verified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-600/50">
                        <ShieldQuestion className="w-3 h-3 text-slate-400" />
                        <span>Not Verified (Static Only)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pr-2">
                    {comp.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {comp.verified ? (
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-bold font-mono text-cyan-300">
                        {comp.score}
                        <span className="text-xs text-slate-500 font-normal">/100</span>
                      </div>
                      <div className="w-16 sm:w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-violet-500"
                          style={{ width: `${comp.score}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-right text-xs font-mono text-slate-500 italic">
                      Excluded
                    </div>
                  )}

                  <div className="text-slate-400 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </button>

              {/* Expandable Reasons List */}
              {isExpanded && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-white/5 space-y-2">
                  <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-2">
                    Evaluated Factors & Observations
                  </div>
                  <ul className="space-y-2">
                    {comp.reasons.map((reason, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                        {comp.verified ? (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                        )}
                        <span className="leading-relaxed">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
