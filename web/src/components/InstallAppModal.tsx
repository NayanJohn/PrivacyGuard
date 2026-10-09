import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Smartphone,
  Download,
  QrCode,
  Shield,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Wifi,
} from 'lucide-react';
import { useInstallPrompt } from '../context/InstallPromptContext';

const DEFAULT_LAN_IP = '100.107.40.101';

export const InstallAppModal: React.FC = () => {
  const navigate = useNavigate();
  const { isOpen, activeFeature, closeInstallModal } = useInstallPrompt();

  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showHowToInstall, setShowHowToInstall] = useState(false);
  const [qrMode, setQrMode] = useState<'apk' | 'pwa'>('apk');

  // Compute live local network host for phone scanning
  const [hostAddress] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.host;
    }
    return `${DEFAULT_LAN_IP}:5173`;
  });

  const appSha256 = import.meta.env.VITE_APP_SHA256 || '777edb7b203bbf198293355346388bee6bcbaf36d885f960c7872365d1ecf34d';

  // URLs for scanning and downloading
  const apkDownloadPath = '/PrivacyGuard-v1.4.2.apk';
  const qrTargetUrl = qrMode === 'apk'
    ? `http://${hostAddress}/PrivacyGuard-v1.4.2.apk`
    : `http://${hostAddress}/app`;

  const handleLaunchInBrowser = () => {
    closeInstallModal();
    const feat = activeFeature?.toLowerCase() || '';
    if (feat.includes('app')) {
      navigate('/apps');
    } else if (feat.includes('permission')) {
      navigate('/permissions');
    } else if (feat.includes('alert')) {
      navigate('/alerts');
    } else if (feat.includes('history')) {
      navigate('/history');
    } else if (feat.includes('runtime')) {
      navigate('/runtime');
    } else {
      navigate('/app');
    }
  };

  const copySha = () => {
    navigator.clipboard.writeText(appSha256);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const copyQrUrl = () => {
    navigator.clipboard.writeText(qrTargetUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeInstallModal}>
        {/* Backdrop */}
        <TransitionChild
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 text-left align-middle shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.15)] border border-cyan-500/30 transition-all space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{activeFeature || 'Mobile App Feature'}</span>
                    </div>
                    <DialogTitle as="h3" className="font-display text-xl sm:text-2xl font-bold text-white pt-1">
                      Download PrivacyGuard App
                    </DialogTitle>
                  </div>
                  <button
                    type="button"
                    onClick={closeInstallModal}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    aria-label="Close install modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Launch In-Browser Action */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Instant In-Browser Experience
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Ready Now</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    You don't need to sideload anything to test the app features. Run the full on-device suite right in your browser.
                  </p>
                  <button
                    type="button"
                    onClick={handleLaunchInBrowser}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl font-display font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 shadow-md transition-all"
                  >
                    <span>Launch Feature in Browser Right Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px bg-white/10 flex-grow" />
                  <span className="text-[11px] font-mono text-slate-500 uppercase">Or Standalone Android APK</span>
                  <div className="h-px bg-white/10 flex-grow" />
                </div>

                {/* Direct PC / Device Download Button */}
                <div className="space-y-2">
                  <a
                    href={apkDownloadPath}
                    download="PrivacyGuard-v1.4.2.apk"
                    className="w-full py-3 px-5 rounded-2xl font-display font-semibold text-sm flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 shadow-md transition-all"
                  >
                    <Download className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Download PrivacyGuard APK Directly (.apk)</span>
                  </a>
                  <p className="text-center text-[11px] font-mono text-slate-400">
                    File: <code className="text-cyan-300">PrivacyGuard-v1.4.2.apk</code> • Android 8.0+
                  </p>
                </div>

                {/* QR Code Section for Phone Scanning */}
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950/70 border border-white/10">
                  {/* Mode tabs */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                      <QrCode className="w-4 h-4" />
                      <span>Scan with Phone Camera</span>
                    </div>

                    <div className="inline-flex rounded-lg bg-black/60 p-0.5 border border-white/10 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setQrMode('apk')}
                        className={`px-2 py-0.5 rounded-md transition-colors ${
                          qrMode === 'apk'
                            ? 'bg-cyan-500/30 text-cyan-300 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        APK Download
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrMode('pwa')}
                        className={`px-2 py-0.5 rounded-md transition-colors ${
                          qrMode === 'pwa'
                            ? 'bg-cyan-500/30 text-cyan-300 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Mobile App (PWA)
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
                    <div className="p-2.5 bg-white rounded-xl shadow-md shrink-0">
                      <QRCodeSVG
                        value={qrTargetUrl}
                        size={120}
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    <div className="space-y-2 text-center sm:text-left text-xs min-w-0 flex-grow">
                      <p className="text-slate-300 leading-relaxed">
                        {qrMode === 'apk'
                          ? 'Scan to download PrivacyGuard-v1.4.2.apk directly to your Android device.'
                          : 'Scan to open the PrivacyGuard App directly in your mobile browser and install to home screen.'}
                      </p>

                      {/* URL and copy action */}
                      <div className="p-2 rounded-lg bg-black/70 border border-white/10 font-mono text-[11px] text-cyan-300 flex items-center justify-between gap-2">
                        <span className="truncate">{qrTargetUrl}</span>
                        <button
                          type="button"
                          onClick={copyQrUrl}
                          className="p-1 rounded text-slate-400 hover:text-cyan-400 shrink-0"
                          title="Copy URL"
                        >
                          {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Network notice */}
                      <div className="flex items-start gap-1.5 text-[11px] text-amber-300/90 bg-amber-950/20 p-2 rounded-lg border border-amber-500/20">
                        <Wifi className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                        <span>
                          <strong>Wi-Fi Requirement:</strong> Your phone must be connected to the <strong>same Wi-Fi network</strong> as this PC to scan local address <code className="text-amber-200">{hostAddress}</code>.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible: Verify the Download (SHA-256) */}
                <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-900/40">
                  <button
                    type="button"
                    onClick={() => setShowVerify(!showVerify)}
                    className="w-full px-4 py-3 flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Verify the download (SHA-256)</span>
                    </span>
                    {showVerify ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showVerify && (
                    <div className="px-4 pb-4 pt-1 space-y-2 border-t border-white/5 text-xs font-mono text-slate-400">
                      <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800 break-all select-all flex items-center justify-between gap-2">
                        <span className="text-[11px] text-cyan-300">{appSha256}</span>
                        <button
                          type="button"
                          onClick={copySha}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 shrink-0"
                          title="Copy SHA-256 hash"
                        >
                          {copiedSha ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans">
                        Compute via terminal: <code className="text-cyan-300 font-mono">Get-FileHash -Path PrivacyGuard-v1.4.2.apk -Algorithm SHA256</code>
                      </p>
                    </div>
                  )}
                </div>

                {/* Collapsible: How to install */}
                <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-900/40">
                  <button
                    type="button"
                    onClick={() => setShowHowToInstall(!showHowToInstall)}
                    className="w-full px-4 py-3 flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-violet-400" />
                      <span>How to install on Android</span>
                    </span>
                    {showHowToInstall ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showHowToInstall && (
                    <div className="px-4 pb-4 pt-1 space-y-2 border-t border-white/5 text-xs text-slate-300 leading-relaxed">
                      <ol className="list-decimal list-inside space-y-1.5 pl-1">
                        <li>Download the APK file using the button or QR code above.</li>
                        <li>When prompted by your browser, tap <strong>Allow install from this source</strong> in Android Settings.</li>
                        <li>Google Play Protect may display a prompt for sideloaded packages. Tap <strong>Install anyway</strong>.</li>
                        <li>Open PrivacyGuard and tap "Scan Installed Apps" to inspect runtime permission allocations.</li>
                      </ol>
                    </div>
                  )}
                </div>

                {/* Footer action */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={closeInstallModal}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    Close
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
