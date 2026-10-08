import { Request, Response, NextFunction } from 'express';
import { User, SupabaseClient } from '@supabase/supabase-js';
import { getBaseSupabaseClient, getScopedSupabaseClient, isSupabaseConfigured } from './supabase.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  supabase?: SupabaseClient;
  token?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({
        error: 'Database Not Configured',
        message: 'SUPABASE_URL and SUPABASE_ANON_KEY are missing in the server environment. Please configure them to connect CivicPulse to your Supabase PostgreSQL instance.',
        code: 'SUPABASE_NOT_CONFIGURED',
      });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. A valid Supabase session Bearer token is required.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Empty Bearer token provided.',
      });
      return;
    }

    const baseClient = getBaseSupabaseClient();
    const { data: { user }, error } = await baseClient.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: error ? error.message : 'Invalid or expired Supabase user session.',
      });
      return;
    }

    req.user = user;
    req.token = token;
    req.supabase = getScopedSupabaseClient(token);
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication verification failed';
    res.status(500).json({
      error: 'Authentication Error',
      message,
    });
  }
}

/**
 * Log activity event helper
 */
export async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  eventType: string,
  description: string,
  entityType: string,
  entityId?: string | null
): Promise<void> {
  try {
    await supabase.from('activity_events').insert({
      user_id: userId,
      event_type: eventType,
      description,
      entity_type: entityType,
      entity_id: entityId || null,
    });
  } catch (e) {
    console.warn('Failed to log activity event:', e);
  }
}
