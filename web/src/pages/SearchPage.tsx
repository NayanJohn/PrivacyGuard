import React, { useState } from 'react';
import { Search, Loader2, Shield, UploadCloud, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { SearchAppResult } from '../api/schema';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchAppResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      const res = await apiClient.searchApps(query.trim());
      setResults(res.apps || []);
    } catch (err: any) {
      setError(err.message || 'Failed to search applications.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 min-h-[80vh]">
      {/* Search Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
          <Search className="w-3.5 h-3.5" />
          <span>Real App Privacy Registry</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Search Android Applications
        </h1>
        <p className="text-sm text-slate-300">
          Search stored audited applications or query live Google Play Store listings.
          If an application has not yet been audited, you can upload its base APK to calculate its 3-component score.
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by app name or package (e.g., Notes, Camera, Signal)..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900/90 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors shadow-xl"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-900/20 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Search</span>}
        </button>
      </form>

      {/* Results Container */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-mono">Querying audited records & Play Store metadata...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-2 max-w-md mx-auto">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="py-16 text-center space-y-4 rounded-3xl bg-slate-900/40 border border-white/5 p-8 max-w-lg mx-auto">
          <Shield className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Matching Applications Found</h3>
          <p className="text-xs text-slate-400">
            No applications matched "{query}". You can audit any unlisted application directly by uploading its APK file.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload APK to Audit</span>
          </Link>
        </div>
      ) : hasSearched ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
            <span>Found {results.length} result(s) for "{query}"</span>
            <span>Real-time verification</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((app) => (
              <div
                key={app.package_name}
                className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white text-base">{app.app_name}</h3>
                      <p className="text-xs font-mono text-cyan-400">{app.package_name}</p>
                    </div>

                    {app.audited && app.score !== null ? (
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono ${
                        app.score >= 80 ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                        app.score >= 55 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {app.score} / 100
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-mono bg-slate-800 text-slate-400 border border-white/10">
                        Not Scanned Yet
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400">{app.message}</p>
                  <div className="text-[11px] font-mono text-slate-400">
                    Source: {app.source} | {app.developer}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  {app.audited && app.scan_id ? (
                    <Link
                      to={`/report/${app.scan_id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300"
                    >
                      <span>View Full Audit Report</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      to="/"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-cyan-300"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload APK to Audit</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty default state */
        <div className="py-16 text-center space-y-3 rounded-3xl bg-slate-900/30 border border-white/5 p-8 max-w-md mx-auto">
          <Search className="w-10 h-10 text-cyan-400/50 mx-auto" />
          <h3 className="text-base font-semibold text-white">Search Any Android Application</h3>
          <p className="text-xs text-slate-400">
            Type any package name or app title to check whether an explainable audit score exists in the database.
          </p>
        </div>
      )}
    </div>
  );
};
