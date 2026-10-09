import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Code, Database, Sparkles } from 'lucide-react';
import type { Finding } from '../api/schema';
import { RelevanceBadge, EvidenceBadge } from './EvidenceBadge';

interface PermissionTableProps {
  findings: Finding[];
  category: string;
}

export const PermissionTable: React.FC<PermissionTableProps> = ({ findings, category }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full space-y-4 text-left">
      <div className="pb-2 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-lg sm:text-xl font-bold font-display text-white">
            Declared Permission Audit
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Plain-language analysis of low-level capabilities, peer benchmark prevalence, and compiled evidence traces.
          </p>
        </div>
        <div className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-500/20 self-start sm:self-auto">
          {findings.length} Permissions Detected
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl">
        <table className="w-full text-left border-collapse" role="table">
          <thead>
            <tr className="border-b border-white/10 bg-slate-950/80 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <th scope="col" className="p-4 font-semibold">Permission & Purpose</th>
              <th scope="col" className="p-4 font-semibold">Relevance Class</th>
              <th scope="col" className="p-4 font-semibold">Benchmark Adoption</th>
              <th scope="col" className="p-4 font-semibold text-right">Evidence Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
            {findings.map((item) => {
              const isExpanded = expandedId === item.id;

              return (
                <React.Fragment key={item.id}>
                  <tr
                    onClick={() => toggleExpand(item.id)}
                    className="hover:bg-cyan-950/20 cursor-pointer transition-colors group"
                  >
                    {/* Permission & Plain Language Purpose */}
                    <td className="p-4 align-top max-w-xs sm:max-w-md">
                      <div className="space-y-1">
                        <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                          <span>{item.name}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.purpose}
                        </p>
                        <div className="font-mono text-[11px] text-slate-500 truncate pt-0.5" title={item.permission}>
                          {item.permission}
                        </div>
                      </div>
                    </td>

                    {/* Relevance Badge */}
                    <td className="p-4 align-top whitespace-nowrap">
                      <RelevanceBadge level={item.relevance} />
                    </td>

                    {/* Category Benchmark % */}
                    <td className="p-4 align-top">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-200">
                          <span>{item.benchmark_pct}%</span>
                          <span className="text-[10px] text-slate-400 font-normal">of peer apps</span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              item.benchmark_pct < 20
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(item.benchmark_pct, 100)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          {item.category_comparison}
                        </p>
                      </div>
                    </td>

                    {/* Action / Evidence Indicator */}
                    <td className="p-4 align-top text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 group-hover:text-cyan-300">
                        <EvidenceBadge type={item.evidence_type} />
                        <span className="p-1 rounded bg-slate-800/80 border border-white/5">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Forensic Evidence Row */}
                  {isExpanded && (
                    <tr className="bg-slate-950/70 border-b border-cyan-500/20">
                      <td colSpan={4} className="p-4 sm:p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Code Evidence */}
                          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
                              <span className="flex items-center gap-1.5">
                                <Code className="w-3.5 h-3.5" />
                                <span>Bytecode & Manifest Trace</span>
                              </span>
                              <EvidenceBadge type={item.evidence_type} />
                            </div>
                            <p className="text-xs font-mono text-slate-300 bg-slate-950/90 p-3 rounded-lg border border-white/5 break-all leading-relaxed">
                              {item.evidence_details}
                            </p>
                          </div>

                          {/* Benchmark Context */}
                          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-mono text-violet-400">
                              <Database className="w-3.5 h-3.5" />
                              <span>Peer Benchmark Reference ({category})</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/90 p-3 rounded-lg border border-white/5">
                              {item.category_comparison} Apps asking for this permission deviate from standard baseline declarations.
                            </p>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>Observed in static analysis. Check runtime status in the Android app.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
