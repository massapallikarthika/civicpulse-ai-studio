import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest } from '../lib/api.js';
import { Profile } from '../types/database.js';
import { formatDateTime } from '../utils/formatters.js';

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    } else if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!fullName.trim()) {
      setError('Full name cannot be blank');
      return;
    }

    setSaving(true);
    try {
      await apiRequest<Profile>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
      setSuccess(true);
      await refreshProfile();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Municipal Officer Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Credentials, administrative authority, and account metadata
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-slate-900 to-blue-900 px-6 flex items-end pb-4">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-md border-2 border-white flex items-center justify-center font-bold text-2xl text-blue-700 transform translate-y-8">
            {(fullName[0] || user?.email?.[0] || 'M').toUpperCase()}
          </div>
        </div>

        <div className="pt-10 p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Officer profile updated successfully.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Official Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  disabled
                  value={user?.email || profile?.email || ''}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Managed via Supabase Auth. Contact municipal IT administrator to update credentials.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Designated Role
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-blue-600 absolute left-3 top-2.5" />
                <input
                  type="text"
                  disabled
                  value={profile?.role || 'Municipal Officer'}
                  className="w-full pl-9 pr-3 py-2 bg-blue-50/50 border border-blue-200 rounded-lg text-sm font-semibold text-blue-900 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Standard local government role for Problem Statement G9.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>

          {/* Account Meta */}
          <div className="border-t border-slate-100 pt-4 text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Account Identifier:</span>
              <span className="font-mono text-slate-700">{user?.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Member Since:</span>
              <span>{formatDateTime(profile?.created_at || user?.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
