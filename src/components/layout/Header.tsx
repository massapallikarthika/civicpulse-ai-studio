import { useState } from 'react';
import { Menu, LogOut, Sparkles, Building2, Database, Copy, Check, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user, profile, signOut } = useAuth();
  const [showDbModal, setShowDbModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopySchema = async () => {
    try {
      const res = await fetch('/schema.sql');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Hamburger + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-700" />
              <span className="font-semibold text-slate-800 text-sm tracking-tight">
                Local Government Resource & Operations Console
              </span>
            </div>
          </div>

          {/* Center: Decision Support Indicator */}
          <div className="hidden md:flex items-center gap-2 bg-blue-50/80 border border-blue-200/70 text-blue-900 px-3 py-1 rounded-full text-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span className="font-medium">
              AI-generated decision support. Officers should verify information and use their judgement.
            </span>
          </div>

          {/* Right: DB Guide, Officer Profile & Logout */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDbModal(true)}
              title="Supabase Schema & SQL Migration"
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>SQL Schema</span>
            </button>

            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-900 leading-tight">
                {profile?.full_name || user?.user_metadata?.full_name || 'Municipal Officer'}
              </div>
              <div className="text-[11px] font-medium text-blue-700 bg-blue-50 inline-block px-1.5 py-0.2 rounded border border-blue-100">
                {profile?.role || 'Municipal Officer'}
              </div>
            </div>

            <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
              {(profile?.full_name?.[0] || user?.email?.[0] || 'M').toUpperCase()}
            </div>

            <button
              onClick={() => signOut()}
              title="Sign out"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile subheader disclaimer banner */}
        <div className="md:hidden bg-blue-50/80 border-t border-blue-100 px-4 py-1 text-center text-[11px] text-blue-800 font-medium">
          AI Decision Support • Officers verify ground records
        </div>
      </header>

      {/* Schema Modal */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-base">CivicPulse Database Migration (schema.sql)</h3>
              </div>
              <button
                onClick={() => setShowDbModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-700">
              <p className="text-xs text-slate-600 leading-relaxed">
                CivicPulse is connected to Supabase PostgreSQL. All 10 municipal tables, indexes, triggers, and Row Level Security (RLS) policies are defined in <code>schema.sql</code>.
              </p>

              <div className="bg-slate-900 text-slate-200 font-mono text-xs p-3 rounded-lg overflow-x-auto space-y-1">
                <div className="text-blue-400 font-semibold">-- Tables created:</div>
                <div>1. profiles        6. resources</div>
                <div>2. wards           7. ai_insights</div>
                <div>3. complaints      8. activity_events</div>
                <div>4. projects        9. ai_runs</div>
                <div>5. services       10. ai_usage_windows</div>
              </div>

              <div>
                <button
                  onClick={handleCopySchema}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      Copied schema.sql to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Complete schema.sql (Run in Supabase SQL Editor)
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowDbModal(false)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
