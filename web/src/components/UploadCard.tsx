import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link } from 'react-router-dom';
import { UploadCloud, FileCheck, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { APP_CATEGORIES } from '../lib/constants';

interface UploadCardProps {
  onStartAudit: (file: File | Blob, fileName: string, claim: string, category: string) => void;
  isLoading: boolean;
}

export const UploadCard: React.FC<UploadCardProps> = ({ onStartAudit, isLoading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [claim, setClaim] = useState<string>('');
  const [category, setCategory] = useState<string>('Auto-detect from claim');
  const [hasConsented, setHasConsented] = useState<boolean>(false);

  // Dropzone setup with strict .apk filter and max 500MB limit
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setFileError(null);

    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setFileError('File exceeds 500 MB limit. Please select a smaller APK.');
      } else {
        setFileError('Invalid file type. Only Android packages (.apk) are accepted.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (!file.name.toLowerCase().endsWith('.apk')) {
        setFileError('Invalid file extension. Please select an Android APK (.apk).');
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.android.package-archive': ['.apk'],
    },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024, // 500 MB
    disabled: isLoading,
  });

  // Preload Demo Notes sample APK (Real APK fixture)
  const handleLoadDemo = async () => {
    try {
      const response = await fetch('/demo_notes.apk');
      const blob = await response.blob();
      const demoFile = new File([blob], 'demo_notes.apk', { type: 'application/vnd.android.package-archive' });
      setSelectedFile(demoFile);
      setFileError(null);
      setClaim('A clean note-taking app that lets users create, edit and save notes with markdown support.');
      setCategory('Notes');
      setHasConsented(true);
    } catch {
      setFileError('Could not preload demo APK.');
    }
  };

  const isFormValid =
    selectedFile !== null &&
    (claim.trim().length > 0 || category !== 'Auto-detect from claim') &&
    hasConsented &&
    !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selectedFile) return;

    onStartAudit(selectedFile, selectedFile.name, claim.trim(), category);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6 text-left">
      {/* 1. Dropzone */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span>1. Android APK File</span>
            <span className="text-xs font-normal text-slate-400 font-mono">(Max 500 MB)</span>
          </label>
          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors focus:outline-none focus-visible:underline disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Load Demo APK</span>
          </button>
        </div>

        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
            isDragActive
              ? 'border-cyan-400 bg-cyan-950/30'
              : selectedFile
              ? 'border-emerald-500/50 bg-emerald-950/15'
              : 'border-slate-700/80 hover:border-cyan-500/50 hover:bg-slate-900/50'
          }`}
        >
          <input {...getInputProps()} aria-label="Drop an APK here or choose a file" />

          {selectedFile ? (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-emerald-300 font-mono">{selectedFile.name}</div>
              <div className="text-xs text-slate-400">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for manifest extraction
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="text-xs text-rose-400 hover:text-rose-300 underline pt-1"
              >
                Choose a different file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-sm font-medium text-slate-200">
                <span className="text-cyan-400 font-semibold">Drop an APK here</span> or choose a file
              </div>
              <div className="text-xs text-slate-400">Supports .apk packages up to 500 MB</div>
            </div>
          )}
        </div>

        {fileError && (
          <div className="mt-2 flex items-center gap-2 text-xs text-rose-400 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fileError}</span>
          </div>
        )}
      </div>

      {/* 2. Claim Textarea */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="app-claim" className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span>2. What does this app say it does?</span>
            <span className="text-xs font-normal text-slate-400 font-mono">(Optional but recommended)</span>
          </label>
          <span className="text-xs font-mono text-slate-400">{claim.length}/500</span>
        </div>
        <textarea
          id="app-claim"
          value={claim}
          onChange={(e) => setClaim(e.target.value.slice(0, 500))}
          placeholder="a note-taking app that lets users create, edit and save notes"
          rows={3}
          disabled={isLoading}
          maxLength={500}
          className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all resize-none"
        />
        <p className="mt-1 text-xs text-slate-400">
          Comparing the developer's claim with declared permissions enables PrivacyGuard to spot unjustified sensor requests.
        </p>
      </div>

      {/* 3. Category Dropdown */}
      <div>
        <label htmlFor="app-category" className="block text-sm font-semibold text-slate-200 mb-1.5">
          3. Peer Benchmark Category
        </label>
        <select
          id="app-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={isLoading}
          className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
        >
          {APP_CATEGORIES.map((cat) => (
            <option key={cat} value={cat} className="bg-slate-900 text-slate-100">
              {cat}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          Benchmarks your APK against thousands of peer apps in the selected category.
        </p>
      </div>

      {/* 4. Consent Checkbox */}
      <div className="pt-2">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasConsented}
            onChange={(e) => setHasConsented(e.target.checked)}
            disabled={isLoading}
            className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0 focus:outline-none shrink-0"
          />
          <span className="text-xs sm:text-sm text-slate-300 leading-snug">
            I understand this APK is analyzed on PrivacyGuard's server and deleted right after analysis. The report is kept for 7 days.{' '}
            <Link to="/privacy" className="text-cyan-400 hover:text-cyan-300 underline font-medium">
              Read plain language privacy notice
            </Link>
            .
          </span>
        </label>
      </div>

      {/* 5. Start Audit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={!isFormValid}
          className="w-full py-4 px-6 rounded-2xl font-display font-semibold text-base sm:text-lg flex items-center justify-center gap-2 transition-all shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 via-teal-500 to-violet-600 hover:from-cyan-400 hover:via-teal-400 hover:to-violet-500 text-white shadow-cyan-500/25 active:scale-[0.99]"
        >
          <span>Start Privacy Audit</span>
          <ArrowRight className="w-5 h-5 shrink-0" />
        </button>
      </div>
    </form>
  );
};
