import React from 'react';
import { MessageSquareQuote, ShieldAlert, Cpu, ArrowRight } from 'lucide-react';
import type { Finding } from '../api/schema';

interface ThreeLayerViewProps {
  claim: string;
  category: string;
  findings: Finding[];
}

export const ThreeLayerView: React.FC<ThreeLayerViewProps> = ({
  claim,
  category,
  findings,
}) => {
  const sensitiveFindings = findings.filter(
    (f) => f.relevance === 'not_justified' || f.relevance === 'suspicious'
  );

  return (
    <div className="w-full space-y-4 text-left">
      <div className="pb-2 border-b border-white/5">
        <h3 className="text-lg sm:text-xl font-bold font-display text-white">
          Three-Layer Verification View
        </h3>
        <p className="text-xs sm:text-sm text-slate-400">
          Cross-examining stated intent against Android low-level permissions and decompiled byte-code evidence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Layer 1: Developer Claim */}
        <div className="rounded-2xl p-5 bg-gradient-to-b from-cyan-950/30 to-slate-900/60 border border-cyan-500/20 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <MessageSquareQuote className="w-5 h-5 shrink-0" />
              <span className="font-mono text-xs uppercase tracking-wider font-semibold">
                Layer 1: Stated Claim
              </span>
            </div>
            <div className="text-xs font-mono text-cyan-300/80 bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-500/20 inline-block">
              Category: {category}
            </div>
            <p className="text-sm text-slate-200 leading-relaxed italic bg-slate-900/60 p-3 rounded-xl border border-white/5">
              "{claim || `Standard user expectation for a ${category} application.`}"
            </p>
          </div>
          <div className="pt-4 text-xs text-slate-400">
            Establishes the functional baseline against which permission requests are evaluated.
          </div>
        </div>

        {/* Layer 2: Declared Permissions */}
        <div className="rounded-2xl p-5 bg-gradient-to-b from-violet-950/30 to-slate-900/60 border border-violet-500/20 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-violet-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span className="font-mono text-xs uppercase tracking-wider font-semibold">
                Layer 2: Declared Permissions
              </span>
            </div>
            <div className="text-xs font-mono text-violet-300/80 bg-violet-950/40 px-2.5 py-1 rounded-md border border-violet-500/20 inline-block">
              {findings.length} Total Permissions Declared
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="text-slate-400">Flagged for human review:</div>
              {sensitiveFindings.slice(0, 3).map((f) => (
                <div
                  key={f.id}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-amber-500/30 text-amber-300 font-mono text-[11px] truncate"
                >
                  {f.permission}
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 text-xs text-slate-400">
            Extracted directly from the compiled AndroidManifest.xml package root.
          </div>
        </div>

        {/* Layer 3: Forensic Evidence */}
        <div className="rounded-2xl p-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Cpu className="w-5 h-5 shrink-0" />
              <span className="font-mono text-xs uppercase tracking-wider font-semibold">
                Layer 3: Forensic Evidence
              </span>
            </div>
            <div className="text-xs font-mono text-emerald-300/80 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-500/20 inline-block">
              Static Code & Bytecode Trace
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Static symbol mapping proves that hardware API calls are compiled into package classes, rather than harmless orphaned manifest declarations.
            </p>
          </div>
          <div className="pt-4 text-xs text-slate-400 flex items-center gap-1.5">
            <span>Observed in DEX Bytecode</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
