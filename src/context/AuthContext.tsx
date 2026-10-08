import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { apiRequest, setAuthToken, getAuthToken, clearAuthToken } from '../lib/api.js';
import { Profile } from '../types/database.js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isBackendConfigured: boolean;
  geminiConfigured: boolean;
  backendError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBackendConfigured, setIsBackendConfigured] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Initialize server configuration status and session
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          setIsBackendConfigured(Boolean(data.supabaseConfigured));
          setGeminiConfigured(Boolean(data.geminiConfigured));
        }

        // Verify active session token if one exists
        const token = getAuthToken();
        if (token) {
          try {
            const authData = await apiRequest<{ user: User; profile: Profile }>('/api/auth/session');
            if (authData?.user) {
              setUser(authData.user);
              setProfile(authData.profile || null);
              setSession({ access_token: token } as Session);
            } else {
              clearAuthToken();
            }
          } catch {
            clearAuthToken();
          }
        }
      } catch (err: unknown) {
        console.warn('Backend status check warning:', err);
        setBackendError(err instanceof Error ? err.message : 'Cannot reach backend server');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  async function loadProfile() {
    try {
      const prof = await apiRequest<Profile>('/api/profile');
      if (prof) setProfile(prof);
    } catch (e) {
      console.warn('Failed to refresh officer profile:', e);
    }
  }

  async function signIn(email: string, password: string): Promise<{ error: Error | null }> {
    try {
      const data = await apiRequest<{ user: User; session: Session; profile: Profile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (data?.session?.access_token) {
        setAuthToken(data.session.access_token);
        setUser(data.user);
        setSession(data.session);
        setProfile(data.profile || null);
        return { error: null };
      }

      return { error: new Error('Login failed: no session returned') };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      return { error: new Error(msg) };
    }
  }

  async function signUp(email: string, password: string, fullName: string): Promise<{ error: Error | null }> {
    try {
      const data = await apiRequest<{ user: User; session: Session; profile: Profile }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim() || 'Municipal Officer',
        }),
      });

      if (data?.session?.access_token) {
        setAuthToken(data.session.access_token);
        setUser(data.user);
        setSession(data.session);
        setProfile(data.profile || null);
        return { error: null };
      }

      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      return { error: new Error(msg) };
    }
  }

  async function signOut(): Promise<void> {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    } finally {
      clearAuthToken();
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  }

  async function resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Password reset failed') };
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isBackendConfigured,
        geminiConfigured,
        backendError,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
