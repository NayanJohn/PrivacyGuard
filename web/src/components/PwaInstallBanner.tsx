import React, { useState, useEffect } from 'react';
import { Download, Sparkles, Check, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallBanner: React.FC<{ variant?: 'button' | 'banner' }> = ({ variant = 'button' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstructions((prev) => !prev);
    }
  };

  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span>App Installed</span>
      </div>
    );
  }

  if (variant === 'button') {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-sm hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          title="Install PrivacyGuard as an app on your computer or phone"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {showInstructions && (
          <div className="absolute right-0 top-full mt-2 w-72 p-3.5 rounded-2xl glass-panel shadow-2xl border border-cyan-500/30 text-xs text-slate-200 z-50 space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between text-cyan-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Install to Home Screen
              </span>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              To install PrivacyGuard directly onto your device:
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-start gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Android / Chrome:</strong> Tap browser menu &gt; <em>"Install app"</em> or <em>"Add to Home screen"</em>.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Desktop:</strong> Click the install icon in your browser URL bar.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-violet-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Install PrivacyGuard Application</h4>
          <p className="text-xs text-slate-400">Run as a standalone app with offline capability and instant launch.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleInstallClick}
        className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display transition-colors shrink-0 shadow-md"
      >
        Install Now
      </button>
    </div>
  );
};
