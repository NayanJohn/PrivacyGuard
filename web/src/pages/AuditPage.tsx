import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Sparkles, Smartphone, ArrowDown, AlertOctagon, RotateCcw, FileText } from 'lucide-react';
import { FloatingPanel } from '../scene/FloatingPanel';
import { UploadCard } from '../components/UploadCard';
import { ProgressSteps } from '../components/ProgressSteps';
import { LockedFeatureCard } from '../components/LockedFeatureCard';
import { LOCKED_FEATURES, type LockedFeatureInfo } from '../lib/constants';
import { apiClient } from '../api/client';
import { useAuditPolling } from '../hooks/useAuditPolling';
import { WORDING } from '../lib/wording';

interface AuditPageProps {
  onStateChange?: (state: 'home' | 'auditing' | 'report') => void;
}

export const AuditPage: React.FC<AuditPageProps> = ({ onStateChange }) => {
  const navigate = useNavigate();

  const [auditId, setAuditId] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [currentFileName, setCurrentFileName] = useState<string>('Selected APK');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Poll backend for real progress
  const { currentStage, error: pollError } = useAuditPolling({
    auditId,
    enabled: isAuditing,
    onComplete: (completed) => {
      if (onStateChange) onStateChange('report');
      navigate(`/report/${completed.audit_id}`);
    },
    onError: (err) => {
      setUploadError(err);
    },
  });

  const handleStartAudit = async (
    file: File | Blob,
    fileName: string,
    claim: string,
    category: string
  ) => {
    try {
      setUploadError(null);
      setCurrentFileName(fileName);
      setIsAuditing(true);
      if (onStateChange) onStateChange('auditing');

      const response = await apiClient.uploadApk(
        file,
        fileName,
        claim,
        category,
        (percent) => setUploadPercent(percent)
      );

      setAuditId(response.audit_id);
    } catch (err: unknown) {
      setIsAuditing(false);
      if (onStateChange) onStateChange('home');
      const msg = err instanceof Error ? err.message : 'Failed to initialize APK audit.';
      setUploadError(msg);
    }
  };

  const handleSkipToReport = () => {
    if (auditId) {
      if (onStateChange) onStateChange('report');
      navigate(`/report/${auditId}`);
    } else {
      if (onStateChange) onStateChange('report');
      navigate('/report/demo-notes');
    }
  };

  const handleReset = () => {
    setIsAuditing(false);
    setAuditId(null);
    setUploadError(null);
    setUploadPercent(0);
    if (onStateChange) onStateChange('home');
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-start pt-6 sm:pt-12 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>ZERO-TRUST APK PRIVACY ENGINE</span>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
          {WORDING.tagline}
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Upload any Android APK file to generate an explainable privacy risk score (0–100).
          PrivacyGuard compares declared permissions against developer claims and peer category benchmarks.
        </p>

        {/* Quick link to view demo report immediately */}
        <div className="pt-1">
          <Link
            to="/report/demo-notes"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-4 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Or inspect the sample Demo Notes Audit Report directly &rarr;</span>
          </Link>
        </div>
      </div>

      {/* The Live Floating Webpage Panel */}
      <div className="w-full max-w-2xl mx-auto mb-20 relative">
        <FloatingPanel enableTilt={!isAuditing}>
          {uploadError || pollError ? (
            /* Error state with retry */
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                <AlertOctagon className="w-7 h-7" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">
                Analysis Encountered an Issue
              </h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                {uploadError || pollError || 'Unable to parse APK package manifest.'}
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-white border border-white/10 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try another file</span>
              </button>
            </div>
          ) : isAuditing ? (
            /* Real-time backend stages progress */
            <ProgressSteps
              currentStage={currentStage}
              uploadPercent={uploadPercent}
              appName={currentFileName}
              onSkipToReport={handleSkipToReport}
            />
          ) : (
            /* Standard Upload Card */
            <UploadCard
              onStartAudit={handleStartAudit}
              isLoading={isAuditing}
            />
          )}
        </FloatingPanel>

        {/* Scroll indicator */}
        <div className="flex flex-col items-center justify-center pt-8 text-slate-400 text-xs font-mono">
          <span className="mb-1">Scroll to explore on-device protections</span>
          <ArrowDown className="w-4 h-4 animate-bounce text-cyan-400" />
        </div>
      </div>

      {/* "More in the app" Section with 5 locked 3D feature tiles */}
      <section className="w-full max-w-6xl mx-auto pt-8 border-t border-white/5 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-violet-500/10 text-violet-300 border border-violet-500/20">
            <Smartphone className="w-3.5 h-3.5 text-violet-400" />
            <span>HONEST APP INVITATION</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            More in the PrivacyGuard Android App
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Websites cannot access installed packages or system-level permission allocations on your device.
            The open PrivacyGuard Android app unlocks on-device intelligence without uploading any data.
          </p>
        </div>

        {/* 5 locked-feature 3D tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {LOCKED_FEATURES.map((feat: LockedFeatureInfo) => (
            <LockedFeatureCard key={feat.title} feature={feat} />
          ))}

          {/* Sixth promotional card inviting download */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-violet-950/40 border border-cyan-500/30 flex flex-col justify-between text-left">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="font-display font-bold text-lg text-white">
                Always Free & Open
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                No subscription, no accounts, no ads, and no background telemetry. Designed for total personal privacy.
              </p>
            </div>
            <div className="pt-4 text-xs font-mono text-cyan-300">
              Direct sideload APK available
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
