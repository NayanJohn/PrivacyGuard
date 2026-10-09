import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold font-display text-white">404 — Page Not Found</h1>
      <p className="text-sm text-slate-400 max-w-md">
        The requested privacy audit page does not exist or has been removed.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 hover:from-cyan-400 hover:to-teal-400 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to APK Audit</span>
      </Link>
    </div>
  );
};
