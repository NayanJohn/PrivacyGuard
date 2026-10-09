import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, Info, ShieldCheck, Cpu, Search } from 'lucide-react';
import { type RelevanceLevel, type EvidenceLevel, RELEVANCE_MAP, EVIDENCE_LABELS } from '../lib/wording';

interface RelevanceBadgeProps {
  level: RelevanceLevel;
  className?: string;
  showDescription?: boolean;
}

export const RelevanceBadge: React.FC<RelevanceBadgeProps> = ({
  level,
  className = '',
}) => {
  const config = RELEVANCE_MAP[level] || RELEVANCE_MAP.potentially_relevant;

  const getIcon = () => {
    switch (level) {
      case 'required':
        return <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0 text-emerald-400" aria-hidden="true" />;
      case 'potentially_relevant':
        return <Info className="w-3.5 h-3.5 mr-1.5 shrink-0 text-cyan-400" aria-hidden="true" />;
      case 'suspicious':
        return <AlertTriangle className="w-3.5 h-3.5 mr-1.5 shrink-0 text-amber-400" aria-hidden="true" />;
      case 'not_justified':
        return <HelpCircle className="w-3.5 h-3.5 mr-1.5 shrink-0 text-rose-400" aria-hidden="true" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.badgeClass} ${className}`}
      title={config.description}
    >
      {getIcon()}
      <span>{config.label}</span>
    </span>
  );
};

interface EvidenceBadgeProps {
  type: EvidenceLevel;
  className?: string;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({ type, className = '' }) => {
  const config = EVIDENCE_LABELS[type] || EVIDENCE_LABELS.not_verified;

  const getIcon = () => {
    switch (type) {
      case 'observed':
        return <Search className="w-3 h-3 mr-1 shrink-0 text-emerald-400" aria-hidden="true" />;
      case 'inferred':
        return <Cpu className="w-3 h-3 mr-1 shrink-0 text-cyan-400" aria-hidden="true" />;
      case 'not_verified':
        return <ShieldCheck className="w-3 h-3 mr-1 shrink-0 text-slate-400" aria-hidden="true" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider border ${config.badge} ${className}`}
      title={config.description}
    >
      {getIcon()}
      <span>{config.label}</span>
    </span>
  );
};
