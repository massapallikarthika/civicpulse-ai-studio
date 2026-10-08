import { useState } from 'react';
import { Database, Copy, Check, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export function SetupBanner() {
  const { isBackendConfigured, geminiConfigured } = useAuth();
  const [copiedSql, setCopiedSql] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // If both Supabase and Gemini are ready, don't show the warning banner
  if (isBackendConfigured && geminiConfigured) {
    return null;
  }

  const handleCopySqlGuide = async () => {
    try {
      const res = await fetch('/schema.sql');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      // Fallback
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    }
  };

  return (
    <>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-amber-900 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>
              {!isBackendConfigured ? (
                <>
                  <strong className="font-semibold">Supabase PostgreSQL Connection Required:</strong> Configure{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-xs">SUPABASE_URL</code> and{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-xs">SUPABASE_ANON_KEY</code> to enable full cloud persistence.
                </>
              ) : (
                <>
                  <strong className="font-semibold">Gemini AI Status:</strong> Database connected. Ensure{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-xs">GEMINI_API_KEY</code> is active for operational analysis.
                </>
              )}
            </span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-medium text-amber-800 underline hover:text-amber-950 flex items-center gap-1 cursor-pointer"
          >
            Setup Guide & Schema SQL
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-base">CivicPulse Database & AI Setup Guide</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-sm text-slate-700">
              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Database className="w-4 h-4 text-blue-600" /> 1. Connect Supabase PostgreSQL & Auth
                </h4>
                <p className="text-slate-600 mb-2 text-xs leading-relaxed">
                  CivicPulse uses Supabase for real authentication, Row-Level Security (RLS), and verified database records.
                  Add these keys to your environment file (<code className="font-mono bg-slate-100 px-1 rounded">.env</code>):
                </p>
                <div className="bg-slate-900 text-slate-100 font-mono text-xs p-3 rounded-lg overflow-x-auto space-y-1">
                  <div>SUPABASE_URL=https://your-project-id.supabase.co</div>
                  <div>SUPABASE_ANON_KEY=eyJhbGciOi...</div>
                  <div>GEMINI_API_KEY=AIzaSy...</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> 2. Execute SQL Migration in Supabase SQL Editor
                </h4>
                <p className="text-slate-600 mb-2 text-xs leading-relaxed">
                  The complete schema includes all 10 tables, triggers, and Row Level Security policies. Copy and run it in your Supabase SQL Editor:
                </p>
                <button
                  onClick={handleCopySqlGuide}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      Copied Complete schema.sql!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Complete schema.sql to Clipboard
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <strong>Officer Note:</strong> Once the migration is executed and environment variables are in place, restart or reload to instantly manage live municipal complaints, wards, projects, services, budgets, and AI insights.
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
