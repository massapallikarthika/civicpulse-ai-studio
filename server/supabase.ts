import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith('http') &&
    SUPABASE_ANON_KEY.length > 10
  );
}

/**
 * Returns a Supabase client scoped to the authenticated user's JWT.
 * When SUPABASE_SERVICE_ROLE_KEY is configured on the backend, it is used as the base
 * API key with the user's JWT Bearer token attached in Authorization headers.
 * This ensures backend queries have appropriate database privileges while preserving
 * authenticated user session context and RLS policies.
 */
export function getScopedSupabaseClient(jwtToken?: string): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.'
    );
  }

  const apiKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

  const options: Parameters<typeof createClient>[2] = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  };

  if (jwtToken) {
    options.global = {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    };
  }

  return createClient(SUPABASE_URL, apiKey, options);
}

/**
 * Returns the base Supabase client for auth verification
 */
export function getBaseSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.'
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Returns the administrative Supabase client using service role key
 */
export function getAdminSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.'
    );
  }

  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  return createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
