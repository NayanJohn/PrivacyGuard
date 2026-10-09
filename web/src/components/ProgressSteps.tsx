import React from 'react';
import { CheckCircle2, Loader2, Circle, ArrowRight } from 'lucide-react';
import { AUDIT_STAGES } from '../lib/constants';

interface ProgressStepsProps {
  currentStage: string;
  uploadPercent?: number;
  appName?: string;
  onSkipToReport?: () => void;
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  currentStage,
  uploadPercent = 100,
  appName = 'Selected APK',
  onSkipToReport,
}) => {
  // Determine active stage index matching real pipeline stages
  const stageLower = currentStage.toLowerCase();
  let activeIndex = 0;
  if (stageLower.includes('complete')) {
    activeIndex = 4;
  } else if (stageLower.includes('mobsf') || stageLower.includes('security')) {
    activeIndex = 3;
  } else if (stageLower.includes('heuristic') || stageLower.includes('policy')) {
    activeIndex = 2;
  } else if (stageLower.includes('ml') || stageLower.includes('riskindroid') || stageLower.includes('calculat')) {
    activeIndex = 1;
  } else if (stageLower.includes('androguard') || stageLower.includes('manifest') || stageLower.includes('reading')) {
    activeIndex = 0;
  }

  return (
    <div className="w-full space-y-6 text-left py-4">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          <span>REAL-TIME STATIC ENGINE ACTIVE</span>
        </div>
        <h3 className="font-display text-2xl font-bold text-white tracking-tight">
          Auditing {appName}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Executing decompilation, AndroidManifest extraction, claim vectorization, and category peer benchmarking.
        </p>
      </div>

      {/* Upload Progress Bar if still uploading */}
      {activeIndex === 0 && uploadPercent < 100 && (
        <div className="space-y-1.5 bg-slate-900/60 p-4 rounded-xl border border-white/5">
          <div className="flex justify-between text-xs font-mono text-slate-300">
            <span>Uploading Package</span>
            <span className="text-cyan-400 font-bold">{uploadPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-200"
              style={{ width: `${uploadPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Sequential Pipeline Stages */}
      <div className="space-y-3 bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80">
        {AUDIT_STAGES.map((stage, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div
              key={stage}
              className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                isCurrent
                  ? 'bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : isDone
                  ? 'bg-slate-900/40 border border-emerald-500/20 text-slate-300'
                  : 'text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <span className={`text-sm font-medium ${isCurrent ? 'text-white font-semibold' : ''}`}>
                  {stage}
                </span>
              </div>

              <div className="text-xs font-mono">
                {isDone ? (
                  <span className="text-emerald-400">Verified</span>
                ) : isCurrent ? (
                  <span className="text-cyan-400 animate-pulse">Processing...</span>
                ) : (
                  <span className="text-slate-400">Queued</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400 font-mono">
        <span>Polling engine every 1.2s</span>
        {onSkipToReport && (
          <button
            type="button"
            onClick={onSkipToReport}
            className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 underline font-sans font-medium"
          >
            <span>Skip to report output</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
