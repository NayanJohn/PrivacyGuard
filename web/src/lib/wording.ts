/**
 * PrivacyGuard Centralized Wording Rules
 * 
 * Strict Guideline:
 * Never use "malware detected", "dangerous" or "malicious" anywhere in the UI.
 * Use "explains and flags for review".
 * A permission request or benchmark deviation is a reason for review, never proof of malice.
 */

export const WORDING = {
  tagline: "Understand Before You Trust.",
  subTagline: "Explainable Android APK Privacy Risk Analysis",
  oneSentence: "Upload an Android APK, state what it claims to do, and receive an explainable privacy risk report grounded in declared permissions and category benchmarks.",
  corePrinciple: "A permission request is a reason for review, never proof of malice.",
  runtimeNote: "Runtime behavior was not observed for uploaded APKs (Not Verified).",
  runtimeExplanation: "Static analysis examines what permissions and components are declared in the APK manifest and code structure. Actual runtime execution (network transfers, dynamic permission prompts) requires on-device monitoring.",
  disclaimer: "PrivacyGuard explains declared permissions, benchmarks against peer applications, and flags unusual declarations for human review. It does not certify software safety nor make definitive assertions of malicious intent.",
  apkRetention: "Uploaded APKs are analyzed strictly in-memory and destroyed immediately after manifest extraction. Generated audit reports are retained securely for 7 days before automatic deletion.",
  mobileAppNotice: "Websites can't see which apps are installed on your phone or what permissions they have. The PrivacyGuard Android app can. It reads app metadata (names, permissions, install times), not your files, messages or photos.",
} as const;

export type RelevanceLevel = 'required' | 'potentially_relevant' | 'suspicious' | 'not_justified';
export type EvidenceLevel = 'observed' | 'inferred' | 'not_verified';

export interface RelevanceConfig {
  label: string;
  shortLabel: string;
  description: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
}

export const RELEVANCE_MAP: Record<RelevanceLevel, RelevanceConfig> = {
  required: {
    label: "Required / Relevant",
    shortLabel: "Relevant",
    description: "Directly aligns with the app's stated core claims and primary category functionality.",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    badgeClass: "bg-emerald-950/60 text-emerald-300 border-emerald-500/40",
  },
  potentially_relevant: {
    label: "Potentially Relevant",
    shortLabel: "Auxiliary",
    description: "Commonly used for auxiliary features (e.g. sharing, vibration, theme switching) or secondary claims.",
    colorClass: "text-cyan-400",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/30",
    badgeClass: "bg-cyan-950/60 text-cyan-300 border-cyan-500/40",
  },
  suspicious: {
    label: "Suspicious / Requires Review",
    shortLabel: "Review Needed",
    description: "Statistically uncommon in this category (< 15% peer adoption) or not explained by stated claims.",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    badgeClass: "bg-amber-950/60 text-amber-300 border-amber-500/40",
  },
  not_justified: {
    label: "Not Obviously Justified",
    shortLabel: "Unjustified",
    description: "Accesses sensitive personal data without apparent connection to user-facing app capabilities.",
    colorClass: "text-rose-400",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/30",
    badgeClass: "bg-rose-950/60 text-rose-300 border-rose-500/40",
  },
};

export const EVIDENCE_LABELS: Record<EvidenceLevel, { label: string; description: string; badge: string }> = {
  observed: {
    label: "Observed",
    description: "Directly declared in the APK AndroidManifest.xml and referenced in compiled byte code.",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  inferred: {
    label: "Inferred",
    description: "Deduced from third-party SDK dependencies or common boilerplate bindings.",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  not_verified: {
    label: "Not Verified",
    description: "Requires runtime instrumentation or on-device permission grant observation.",
    badge: "bg-slate-700/50 text-slate-300 border-slate-600/40",
  },
};

export function getRiskBand(score: number): {
  label: string;
  description: string;
  color: string;
  textColor: string;
  bgGlow: string;
} {
  if (score <= 20) {
    return {
      label: "Low Concern",
      description: "Permissions closely match stated claims and standard category baselines.",
      color: "#10b981", // green
      textColor: "text-emerald-400",
      bgGlow: "rgba(16, 185, 129, 0.2)",
    };
  }
  if (score <= 45) {
    return {
      label: "Moderate Concern",
      description: "App declarations include some auxiliary or optional permissions worth noting.",
      color: "#3b82f6", // blue
      textColor: "text-sky-400",
      bgGlow: "rgba(59, 130, 246, 0.2)",
    };
  }
  if (score <= 70) {
    return {
      label: "Elevated Concern",
      description: "Multiple sensitive permissions deviate significantly from peer category benchmarks.",
      color: "#f59e0b", // amber
      textColor: "text-amber-400",
      bgGlow: "rgba(245, 158, 11, 0.2)",
    };
  }
  return {
    label: "High Concern (Requires Review)",
    description: "Substantial divergence between declared capabilities and standard app expectations.",
    color: "#f97316", // red-orange
    textColor: "text-orange-400",
    bgGlow: "rgba(249, 115, 22, 0.2)",
  };
}
