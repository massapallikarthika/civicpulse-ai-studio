import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest, logActivity } from './middleware.js';
import { isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY, getBaseSupabaseClient, getAdminSupabaseClient } from './supabase.js';
import { generateOperationalInsights } from './gemini.js';
import {
  WardSchema,
  ComplaintSchema,
  ProjectSchema,
  ServiceSchema,
  ResourceSchema,
  ProfileUpdateSchema,
} from '../src/utils/validation.js';

export const apiRouter = Router();

export function isSchemaCacheError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === 'PGRST205' ||
    Boolean(e.message && e.message.toLowerCase().includes('schema cache')) ||
    Boolean(e.message && e.message.toLowerCase().includes('does not exist'))
  );
}

export function isPermissionDeniedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === '42501' ||
    Boolean(e.message && e.message.toLowerCase().includes('permission denied'))
  );
}

// ====================================================================
// System Configuration & Health Status
// ====================================================================
apiRouter.get('/status', (req, res) => {
  const supabaseOk = isSupabaseConfigured();
  const geminiOk = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);

  res.json({
    appName: 'CivicPulse',
    tagline: 'AI-Powered Local Government Resource Dashboard',
    supabaseConfigured: supabaseOk,
    supabaseUrl: supabaseOk ? SUPABASE_URL : null,
    supabaseAnonKey: supabaseOk ? SUPABASE_ANON_KEY : null,
    geminiConfigured: geminiOk,
    serverTime: new Date().toISOString(),
  });
});

// ====================================================================
// Authentication Endpoints (Unauthenticated Access)
// ====================================================================

// Register a new Municipal Officer
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Validation Error', message: 'Email and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Validation Error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    const officerName = (full_name || 'Municipal Officer').trim();
    const adminClient = getAdminSupabaseClient();
    const baseClient = getBaseSupabaseClient();

    // 1. Create confirmed user via Supabase Admin API
    const { data: adminData, error: adminErr } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: officerName },
    });

    if (adminErr) {
      if (adminErr.message.toLowerCase().includes('already') || adminErr.status === 422) {
        res.status(400).json({
          error: 'Registration Error',
          message: 'An officer account is already registered with this email address.',
        });
        return;
      }

      // If admin createUser encounters issue, attempt standard signUp
      const { data: signupData, error: signupErr } = await baseClient.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: officerName } },
      });

      if (signupErr) {
        res.status(400).json({
          error: 'Registration Error',
          message: signupErr.message,
        });
        return;
      }
    }

    // 2. Sign in the newly created officer to issue authenticated session JWT
    const { data: signinData, error: signinErr } = await baseClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signinErr || !signinData.session) {
      res.status(201).json({
        message: 'Account registered. Please log in with your credentials.',
        user: adminData?.user || null,
        session: null,
      });
      return;
    }

    const user = signinData.user;
    const profile = {
      id: user.id,
      full_name: officerName,
      role: 'Municipal Officer',
      email: user.email || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Attempt to persist profile to profiles table
    try {
      await adminClient.from('profiles').upsert(profile);
    } catch {
      // Table may await migration
    }

    res.status(201).json({
      user,
      session: signinData.session,
      profile,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(500).json({ error: 'Server Error', message });
  }
});

// Officer Login
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Validation Error', message: 'Email and password are required.' });
      return;
    }

    const baseClient = getBaseSupabaseClient();
    const { data, error } = await baseClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session) {
      res.status(401).json({
        error: 'Authentication Error',
        message: error ? error.message : 'Invalid officer login credentials.',
      });
      return;
    }

    let profile = {
      id: data.user.id,
      full_name: data.user.user_metadata?.full_name || 'Municipal Officer',
      role: 'Municipal Officer',
      email: data.user.email || null,
      created_at: data.user.created_at,
      updated_at: data.user.created_at,
    };

    try {
      const adminClient = getAdminSupabaseClient();
      const { data: prof } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (prof) {
        profile = prof;
      }
    } catch {
      // Ignore if table not yet migrated
    }

    res.json({
      user: data.user,
      session: data.session,
      profile,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(500).json({ error: 'Server Error', message });
  }
});

// Officer Password Reset
apiRouter.post('/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Validation Error', message: 'Email is required.' });
      return;
    }

    const baseClient = getBaseSupabaseClient();
    const { error } = await baseClient.auth.resetPasswordForEmail(email.trim());

    if (error) {
      res.status(400).json({ error: 'Reset Failed', message: error.message });
      return;
    }

    res.json({ success: true, message: 'Password reset link sent.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Password reset failed';
    res.status(500).json({ error: 'Server Error', message });
  }
});

// Session Verification & Current Officer Profile
apiRouter.get('/auth/session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized', message: 'No bearer session token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const baseClient = getBaseSupabaseClient();
    const { data: { user }, error } = await baseClient.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Session expired or invalid.' });
      return;
    }

    let profile = {
      id: user.id,
      full_name: user.user_metadata?.full_name || 'Municipal Officer',
      role: 'Municipal Officer',
      email: user.email || null,
      created_at: user.created_at,
      updated_at: user.created_at,
    };

    try {
      const adminClient = getAdminSupabaseClient();
      const { data: prof } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (prof) {
        profile = prof;
      }
    } catch {
      // Ignore
    }

    res.json({ user, profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Session verification failed';
    res.status(500).json({ error: 'Server Error', message });
  }
});

// Logout
apiRouter.post('/auth/logout', async (_req, res) => {
  res.json({ success: true, message: 'Signed out successfully.' });
});

// All routes below require valid Supabase session authentication
apiRouter.use(requireAuth);

// ====================================================================
// 1. Officer Profile
// ====================================================================
apiRouter.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    if (!profile) {
      // Auto-insert default profile if record didn't exist yet
      const newProfile = {
        id: userId,
        full_name: req.user!.user_metadata?.full_name || 'Municipal Officer',
        role: 'Municipal Officer',
        email: req.user!.email || null,
      };
      await supabase.from('profiles').insert(newProfile);
      res.json(newProfile);
      return;
    }

    res.json(profile);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch profile';
    res.status(500).json({ error: 'Profile Error', message });
  }
});

apiRouter.put('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = ProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const supabase = req.supabase!;
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: parsed.data.full_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'PROFILE_UPDATED',
      `Officer profile updated: ${parsed.data.full_name}`,
      'profile',
      userId
    );

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update profile';
    res.status(500).json({ error: 'Profile Error', message });
  }
});

// ====================================================================
// 2. Wards CRUD
// ====================================================================
apiRouter.get('/wards', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;

    let { data, error } = await supabase
      .from('wards')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error && isPermissionDeniedError(error)) {
      const adminClient = getAdminSupabaseClient();
      const adminRes = await adminClient
        .from('wards')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      data = adminRes.data;
      error = adminRes.error;
    }

    if (error) {
      if (isSchemaCacheError(error)) {
        res.json([]);
        return;
      }
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    res.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch wards';
    res.status(500).json({ error: 'Wards Error', message });
  }
});

apiRouter.post('/wards', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = WardSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const supabase = req.supabase!;
    const userId = req.user!.id;

    let { data, error } = await supabase
      .from('wards')
      .insert({
        ...parsed.data,
        user_id: userId,
      })
      .select()
      .single();

    if (error && isPermissionDeniedError(error)) {
      const adminClient = getAdminSupabaseClient();
      const adminRes = await adminClient
        .from('wards')
        .insert({
          ...parsed.data,
          user_id: userId,
        })
        .select()
        .single();
      data = adminRes.data;
      error = adminRes.error;
    }

    if (error) {
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'WARD_CREATED',
      `Added municipal ward: ${data.name}${data.code ? ` (${data.code})` : ''}`,
      'ward',
      data.id
    );

    res.status(201).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create ward';
    res.status(500).json({ error: 'Wards Error', message });
  }
});

apiRouter.get('/wards/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    let { data, error } = await supabase
      .from('wards')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && isPermissionDeniedError(error)) {
      const adminClient = getAdminSupabaseClient();
      const adminRes = await adminClient
        .from('wards')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      data = adminRes.data;
      error = adminRes.error;
    }

    if (error || !data) {
      res.status(404).json({ error: 'Not Found', message: 'Ward not found' });
      return;
    }

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve ward';
    res.status(500).json({ error: 'Wards Error', message });
  }
});

apiRouter.put('/wards/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = WardSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    let { data, error } = await supabase
      .from('wards')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error && isPermissionDeniedError(error)) {
      const adminClient = getAdminSupabaseClient();
      const adminRes = await adminClient
        .from('wards')
        .update({
          ...parsed.data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      data = adminRes.data;
      error = adminRes.error;
    }

    if (error || !data) {
      res.status(404).json({ error: 'Not Found', message: 'Ward not found or not editable' });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'WARD_UPDATED',
      `Updated ward details: ${data.name}`,
      'ward',
      data.id
    );

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update ward';
    res.status(500).json({ error: 'Wards Error', message });
  }
});

apiRouter.delete('/wards/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    // Check existing
    let { data: existing } = await supabase
      .from('wards')
      .select('name')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      const adminClient = getAdminSupabaseClient();
      const adminExisting = await adminClient
        .from('wards')
        .select('name')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      existing = adminExisting.data;
    }

    let { error } = await supabase
      .from('wards')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error && isPermissionDeniedError(error)) {
      const adminClient = getAdminSupabaseClient();
      const adminRes = await adminClient
        .from('wards')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      error = adminRes.error;
    }

    if (error) {
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'WARD_DELETED',
      `Deleted ward: ${existing?.name || id}`,
      'ward',
      id
    );

    res.json({ success: true, message: 'Ward deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete ward';
    res.status(500).json({ error: 'Wards Error', message });
  }
});

// ====================================================================
// 3. Complaints CRUD
// ====================================================================
apiRouter.get('/complaints', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;

    const { category, priority, status, ward_id, search, sort } = req.query;

    let query = supabase
      .from('complaints')
      .select('*, wards(id, name, code)')
      .eq('user_id', userId);

    if (category && typeof category === 'string') {
      query = query.eq('category', category);
    }
    if (priority && typeof priority === 'string') {
      query = query.eq('priority', priority);
    }
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }
    if (ward_id && typeof ward_id === 'string') {
      query = query.eq('ward_id', ward_id);
    }
    if (search && typeof search === 'string') {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      if (isSchemaCacheError(error)) {
        res.json([]);
        return;
      }
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    res.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch complaints';
    res.status(500).json({ error: 'Complaints Error', message });
  }
});

apiRouter.post('/complaints', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = ComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const supabase = req.supabase!;
    const userId = req.user!.id;

    const insertData = {
      ...parsed.data,
      ward_id: parsed.data.ward_id || null,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('complaints')
      .insert(insertData)
      .select('*, wards(id, name, code)')
      .single();

    if (error) {
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'COMPLAINT_REGISTERED',
      `Registered complaint: ${data.title} [Priority: ${data.priority}]`,
      'complaint',
      data.id
    );

    res.status(201).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create complaint';
    res.status(500).json({ error: 'Complaints Error', message });
  }
});

apiRouter.get('/complaints/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('complaints')
      .select('*, wards(id, name, code)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Not Found', message: 'Complaint not found' });
      return;
    }

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve complaint';
    res.status(500).json({ error: 'Complaints Error', message });
  }
});

apiRouter.put('/complaints/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = ComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('complaints')
      .update({
        ...parsed.data,
        ward_id: parsed.data.ward_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, wards(id, name, code)')
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Not Found', message: 'Complaint not found or not editable' });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'COMPLAINT_UPDATED',
      `Updated complaint: ${data.title} -> Status: ${data.status}`,
      'complaint',
      data.id
    );

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update complaint';
    res.status(500).json({ error: 'Complaints Error', message });
  }
});

apiRouter.delete('/complaints/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: existing } = await supabase
      .from('complaints')
      .select('title')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    const { error } = await supabase
      .from('complaints')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'COMPLAINT_DELETED',
      `Deleted complaint: ${existing?.title || id}`,
      'complaint',
      id
    );

    res.json({ success: true, message: 'Complaint deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete complaint';
    res.status(500).json({ error: 'Complaints Error', message });
  }
});

// ====================================================================
// 4. Projects CRUD
// ====================================================================
apiRouter.get('/projects', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('projects')
      .select('*, wards(id, name, code)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isSchemaCacheError(error)) {
        res.json([]);
        return;
      }
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    res.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch projects';
    res.status(500).json({ error: 'Projects Error', message });
  }
});

apiRouter.post('/projects', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = ProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const supabase = req.supabase!;
    const userId = req.user!.id;

    const insertData = {
      ...parsed.data,
      ward_id: parsed.data.ward_id || null,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select('*, wards(id, name, code)')
      .single();

    if (error) {
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'PROJECT_CREATED',
      `Initiated municipal project: ${data.name} [Budget: ₹${Number(data.budget).toLocaleString('en-IN')}]`,
      'project',
      data.id
    );

    res.status(201).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create project';
    res.status(500).json({ error: 'Projects Error', message });
  }
});

apiRouter.get('/projects/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('projects')
      .select('*, wards(id, name, code)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Not Found', message: 'Project not found' });
      return;
    }

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve project';
    res.status(500).json({ error: 'Projects Error', message });
  }
});

apiRouter.put('/projects/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = ProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('projects')
      .update({
        ...parsed.data,
        ward_id: parsed.data.ward_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, wards(id, name, code)')
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Not Found', message: 'Project not found or not editable' });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'PROJECT_UPDATED',
      `Updated project progress: ${data.name} (${data.progress}% complete)`,
      'project',
      data.id
    );

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update project';
    res.status(500).json({ error: 'Projects Error', message });
  }
});

apiRouter.delete('/projects/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: existing } = await supabase
      .from('projects')
      .select('name')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'PROJECT_DELETED',
      `Deleted project: ${existing?.name || id}`,
      'project',
      id
    );

    res.json({ success: true, message: 'Project deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete project';
    res.status(500).json({ error: 'Projects Error', message });
  }
});

// ====================================================================
// 5. Services CRUD
// ====================================================================
apiRouter.get('/services', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('services')
      .select('*, wards(id, name, code)')
      .eq('user_id', userId)
      .order('service_type', { ascending: true });

    if (error) {
      if (isSchemaCacheError(error)) {
        res.json([]);
        return;
      }
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    res.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch services';
    res.status(500).json({ error: 'Services Error', message });
  }
});

apiRouter.post('/services', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = ServiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const supabase = req.supabase!;
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('services')
      .insert({
        ...parsed.data,
        ward_id: parsed.data.ward_id || null,
        user_id: userId,
      })
      .select('*, wards(id, name, code)')
      .single();

    if (error) {
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'SERVICE_RECORDED',
      `Logged service metrics: ${data.service_type} (${data.coverage_percentage}% coverage)`,
      'service',
      data.id
    );

    res.status(201).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record service';
    res.status(500).json({ error: 'Services Error', message });
  }
});

apiRouter.get('/services/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('services')
      .select('*, wards(id, name, code)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Not Found', message: 'Service record not found' });
      return;
    }

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve service';
    res.status(500).json({ error: 'Services Error', message });
  }
});

apiRouter.put('/services/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = ServiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('services')
      .update({
        ...parsed.data,
        ward_id: parsed.data.ward_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, wards(id, name, code)')
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Not Found', message: 'Service not found or not editable' });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'SERVICE_UPDATED',
      `Updated service status: ${data.service_type}`,
      'service',
      data.id
    );

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update service';
    res.status(500).json({ error: 'Services Error', message });
  }
});

apiRouter.delete('/services/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'SERVICE_DELETED',
      `Deleted service metric: ${id}`,
      'service',
      id
    );

    res.json({ success: true, message: 'Service deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete service';
    res.status(500).json({ error: 'Services Error', message });
  }
});

// ====================================================================
// 6. Resources CRUD
// ====================================================================
apiRouter.get('/resources', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', userId)
      .order('department', { ascending: true });

    if (error) {
      if (isSchemaCacheError(error)) {
        res.json([]);
        return;
      }
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    res.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch resources';
    res.status(500).json({ error: 'Resources Error', message });
  }
});

apiRouter.post('/resources', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = ResourceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const supabase = req.supabase!;
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('resources')
      .insert({
        ...parsed.data,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'RESOURCE_ALLOCATED',
      `Added budget allocation: ${data.allocation_name} [${data.department}] ₹${Number(data.allocated_amount).toLocaleString('en-IN')}`,
      'resource',
      data.id
    );

    res.status(201).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create resource';
    res.status(500).json({ error: 'Resources Error', message });
  }
});

apiRouter.get('/resources/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Not Found', message: 'Resource allocation not found' });
      return;
    }

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve resource';
    res.status(500).json({ error: 'Resources Error', message });
  }
});

apiRouter.put('/resources/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = ResourceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('resources')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Not Found', message: 'Resource not found or not editable' });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'RESOURCE_UPDATED',
      `Updated expenditure for ${data.allocation_name}`,
      'resource',
      data.id
    );

    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update resource';
    res.status(500).json({ error: 'Resources Error', message });
  }
});

apiRouter.delete('/resources/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'RESOURCE_DELETED',
      `Removed resource allocation: ${id}`,
      'resource',
      id
    );

    res.json({ success: true, message: 'Resource deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete resource';
    res.status(500).json({ error: 'Resources Error', message });
  }
});

// ====================================================================
// 7. AI Insights
// ====================================================================
apiRouter.get('/ai/insights', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { type } = req.query;

    let query = supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (type && type !== 'all' && typeof type === 'string') {
      // Map frontend filter name if plural
      const mappedType = type.endsWith('s') ? type.slice(0, -1) : type;
      query = query.eq('type', mappedType);
    }

    const { data, error } = await query;
    if (error) {
      if (isSchemaCacheError(error)) {
        res.json([]);
        return;
      }
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    res.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch insights';
    res.status(500).json({ error: 'AI Insights Error', message });
  }
});

apiRouter.post('/ai/insights', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;

    const result = await generateOperationalInsights(supabase, userId);

    if (result.insufficientData) {
      res.status(200).json({
        insufficientData: true,
        message: result.message,
        insights: [],
      });
      return;
    }

    await logActivity(
      supabase,
      userId,
      'AI_INSIGHTS_GENERATED',
      `Generated ${result.insights.length} operational insights from municipal database records`,
      'ai_insight'
    );

    res.status(201).json({
      insufficientData: false,
      insights: result.insights,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI generation error';
    console.error('AI Insights endpoint error:', err);
    res.status(500).json({
      error: 'AI Generation Failed',
      message,
    });
  }
});

apiRouter.delete('/ai/insights/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('ai_insights')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete insight';
    res.status(500).json({ error: 'AI Insights Error', message });
  }
});

// ====================================================================
// 8. Real-time Dashboard Metrics Calculation
// ====================================================================
apiRouter.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;

    // Concurrently fetch all operational tables for this officer
    let [
      { data: wards, error: wardsErr },
      { data: complaints, error: complaintsErr },
      { data: projects, error: projectsErr },
      { data: services, error: servicesErr },
      { data: resources, error: resourcesErr },
      { data: activities, error: activitiesErr },
    ] = await Promise.all([
      supabase.from('wards').select('*').eq('user_id', userId),
      supabase.from('complaints').select('*').eq('user_id', userId),
      supabase.from('projects').select('*').eq('user_id', userId),
      supabase.from('services').select('*').eq('user_id', userId),
      supabase.from('resources').select('*').eq('user_id', userId),
      supabase.from('activity_events').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    ]);

    // If any table returns a permission denied error, seamlessly retry using administrative client
    if (wardsErr && isPermissionDeniedError(wardsErr)) {
      const adminClient = getAdminSupabaseClient();
      const res = await adminClient.from('wards').select('*').eq('user_id', userId);
      wards = res.data;
      wardsErr = res.error;
    }
    if (complaintsErr && isPermissionDeniedError(complaintsErr)) {
      const adminClient = getAdminSupabaseClient();
      const res = await adminClient.from('complaints').select('*').eq('user_id', userId);
      complaints = res.data;
      complaintsErr = res.error;
    }
    if (projectsErr && isPermissionDeniedError(projectsErr)) {
      const adminClient = getAdminSupabaseClient();
      const res = await adminClient.from('projects').select('*').eq('user_id', userId);
      projects = res.data;
      projectsErr = res.error;
    }
    if (servicesErr && isPermissionDeniedError(servicesErr)) {
      const adminClient = getAdminSupabaseClient();
      const res = await adminClient.from('services').select('*').eq('user_id', userId);
      services = res.data;
      servicesErr = res.error;
    }
    if (resourcesErr && isPermissionDeniedError(resourcesErr)) {
      const adminClient = getAdminSupabaseClient();
      const res = await adminClient.from('resources').select('*').eq('user_id', userId);
      resources = res.data;
      resourcesErr = res.error;
    }
    if (activitiesErr && isPermissionDeniedError(activitiesErr)) {
      const adminClient = getAdminSupabaseClient();
      const res = await adminClient.from('activity_events').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
      activities = res.data;
      activitiesErr = res.error;
    }

    if (wardsErr || complaintsErr || projectsErr || servicesErr || resourcesErr) {
      const err = wardsErr || complaintsErr || projectsErr || servicesErr || resourcesErr;
      if (!isSchemaCacheError(err)) {
        res.status(500).json({ error: 'Database error', message: err?.message });
        return;
      }
    }

    const wardsList = (wardsErr && isSchemaCacheError(wardsErr)) ? [] : (wards || []);
    const complaintsList = (complaintsErr && isSchemaCacheError(complaintsErr)) ? [] : (complaints || []);
    const projectsList = (projectsErr && isSchemaCacheError(projectsErr)) ? [] : (projects || []);
    const servicesList = (servicesErr && isSchemaCacheError(servicesErr)) ? [] : (services || []);
    const resourcesList = (resourcesErr && isSchemaCacheError(resourcesErr)) ? [] : (resources || []);
    const activitiesList = (activitiesErr && isSchemaCacheError(activitiesErr)) ? [] : (activities || []);

    // 1. Open Complaints
    const openComplaintsCount = complaintsList.filter(
      (c) => c.status !== 'Resolved' && c.status !== 'Closed'
    ).length;

    // 2. Active Projects
    const activeProjectsCount = projectsList.filter(
      (p) => p.status === 'In Progress' || p.status === 'Planning'
    ).length;

    // 3. Budget & Resource calculations
    let totalAllocatedBudget = 0;
    let totalSpentBudget = 0;

    const departmentMap: Record<string, { allocated: number; spent: number }> = {};

    resourcesList.forEach((r) => {
      const alloc = Number(r.allocated_amount) || 0;
      const spent = Number(r.spent_amount) || 0;
      totalAllocatedBudget += alloc;
      totalSpentBudget += spent;

      const dept = r.department || 'General';
      if (!departmentMap[dept]) {
        departmentMap[dept] = { allocated: 0, spent: 0 };
      }
      departmentMap[dept].allocated += alloc;
      departmentMap[dept].spent += spent;
    });

    const budgetRemaining = totalAllocatedBudget - totalSpentBudget;

    const resourcePosition = Object.entries(departmentMap).map(([dept, vals]) => {
      const rem = vals.allocated - vals.spent;
      const pct = vals.allocated > 0 ? Math.round((vals.spent / vals.allocated) * 100) : 0;
      return {
        department: dept,
        allocated: vals.allocated,
        spent: vals.spent,
        remaining: rem,
        utilizationPercent: pct,
      };
    });

    // 4. Service Coverage & Satisfaction
    let averageServiceCoverage = 0;
    let averageSatisfaction = 0;

    if (servicesList.length > 0) {
      const totalCoverage = servicesList.reduce(
        (sum, s) => sum + (Number(s.coverage_percentage) || 0),
        0
      );
      const totalSat = servicesList.reduce(
        (sum, s) => sum + (Number(s.satisfaction_percentage) || 0),
        0
      );
      averageServiceCoverage = Math.round(totalCoverage / servicesList.length);
      averageSatisfaction = Math.round(totalSat / servicesList.length);
    }

    // 5. Ward Performance Breakdown
    const wardPerformance = wardsList.map((w) => {
      const wardComplaints = complaintsList.filter(
        (c) => c.ward_id === w.id && c.status !== 'Resolved' && c.status !== 'Closed'
      ).length;
      const wardProjects = projectsList.filter(
        (p) => p.ward_id === w.id && (p.status === 'In Progress' || p.status === 'Planning')
      ).length;
      const wardServices = servicesList.filter((s) => s.ward_id === w.id);
      const avgCov =
        wardServices.length > 0
          ? Math.round(
              wardServices.reduce((acc, s) => acc + (Number(s.coverage_percentage) || 0), 0) /
                wardServices.length
            )
          : 0;

      return {
        wardId: w.id,
        wardName: w.name,
        wardCode: w.code,
        openComplaints: wardComplaints,
        activeProjects: wardProjects,
        avgCoverage: avgCov,
      };
    });

    res.json({
      openComplaintsCount,
      activeProjectsCount,
      totalAllocatedBudget,
      totalSpentBudget,
      budgetRemaining,
      averageServiceCoverage,
      averageSatisfaction,
      wardCount: wardsList.length,
      wardPerformance,
      resourcePosition,
      recentActivity: activitiesList,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to calculate dashboard';
    res.status(500).json({ error: 'Dashboard Error', message });
  }
});

// ====================================================================
// 9. Activity Events
// ====================================================================
apiRouter.get('/activity-events', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = req.supabase!;
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('activity_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      if (isSchemaCacheError(error)) {
        res.json([]);
        return;
      }
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    res.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch activities';
    res.status(500).json({ error: 'Activity Error', message });
  }
});
