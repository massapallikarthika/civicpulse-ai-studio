import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Try environment variables first
const envUrl = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
const envKey = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '';

// Fallback to locally stored configuration if entered via setup modal
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('civicpulse_supabase_url') || '' : '';
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('civicpulse_supabase_key') || '' : '';

export const defaultSupabaseUrl = envUrl || storedUrl || 'https://demo-placeholder.supabase.co';
export const defaultSupabaseKey = envKey || storedKey || 'demo-placeholder-anon-key';

export let supabase: SupabaseClient = createClient(defaultSupabaseUrl, defaultSupabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function reconfigureSupabase(url: string, anonKey: string): SupabaseClient {
  if (typeof window !== 'undefined') {
    localStorage.setItem('civicpulse_supabase_url', url);
    localStorage.setItem('civicpulse_supabase_key', anonKey);
  }
  supabase = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return supabase;
}
