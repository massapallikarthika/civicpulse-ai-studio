-- ====================================================================
-- CivicPulse — AI-Powered Local Government Resource Dashboard
-- Complete Supabase PostgreSQL Schema & Row Level Security (RLS)
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'Municipal Officer',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. WARDS
CREATE TABLE IF NOT EXISTS public.wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. COMPLAINTS
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  ward_id UUID REFERENCES public.wards(id) ON DELETE SET NULL,
  responsible_department TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department TEXT,
  ward_id UUID REFERENCES public.wards(id) ON DELETE SET NULL,
  budget NUMERIC NOT NULL DEFAULT 0,
  amount_spent NUMERIC NOT NULL DEFAULT 0,
  progress NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Planning',
  planned_deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. SERVICES
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ward_id UUID REFERENCES public.wards(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  coverage_percentage NUMERIC NOT NULL DEFAULT 0,
  satisfaction_percentage NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  reporting_period TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. RESOURCES
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  allocation_name TEXT NOT NULL,
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  spent_amount NUMERIC NOT NULL DEFAULT 0,
  fiscal_year TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. AI_INSIGHTS
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Medium',
  recommendation TEXT NOT NULL,
  source_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. ACTIVITY_EVENTS
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. AI_RUNS
CREATE TABLE IF NOT EXISTS public.ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_context JSONB,
  output JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. AI_USAGE_WINDOWS
CREATE TABLE IF NOT EXISTS public.ai_usage_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wards_user ON public.wards(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_user ON public.complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_ward ON public.complaints(ward_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_ward ON public.projects(ward_id);
CREATE INDEX IF NOT EXISTS idx_services_user ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_ward ON public.services(ward_id);
CREATE INDEX IF NOT EXISTS idx_resources_user ON public.resources(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON public.ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_user ON public.activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_created ON public.activity_events(created_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- 1. PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. WARDS RLS
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wards" ON public.wards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own wards" ON public.wards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wards" ON public.wards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own wards" ON public.wards FOR DELETE USING (auth.uid() = user_id);

-- 3. COMPLAINTS RLS
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own complaints" ON public.complaints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own complaints" ON public.complaints FOR INSERT WITH CHECK (
  auth.uid() = user_id AND (ward_id IS NULL OR EXISTS (SELECT 1 FROM public.wards WHERE id = ward_id AND user_id = auth.uid()))
);
CREATE POLICY "Users can update own complaints" ON public.complaints FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own complaints" ON public.complaints FOR DELETE USING (auth.uid() = user_id);

-- 4. PROJECTS RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own projects" ON public.projects FOR INSERT WITH CHECK (
  auth.uid() = user_id AND (ward_id IS NULL OR EXISTS (SELECT 1 FROM public.wards WHERE id = ward_id AND user_id = auth.uid()))
);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- 5. SERVICES RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own services" ON public.services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own services" ON public.services FOR INSERT WITH CHECK (
  auth.uid() = user_id AND (ward_id IS NULL OR EXISTS (SELECT 1 FROM public.wards WHERE id = ward_id AND user_id = auth.uid()))
);
CREATE POLICY "Users can update own services" ON public.services FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own services" ON public.services FOR DELETE USING (auth.uid() = user_id);

-- 6. RESOURCES RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own resources" ON public.resources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own resources" ON public.resources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resources" ON public.resources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own resources" ON public.resources FOR DELETE USING (auth.uid() = user_id);

-- 7. AI_INSIGHTS RLS
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own insights" ON public.ai_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own insights" ON public.ai_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own insights" ON public.ai_insights FOR DELETE USING (auth.uid() = user_id);

-- 8. ACTIVITY_EVENTS RLS
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own activity events" ON public.activity_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own activity events" ON public.activity_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. AI_RUNS RLS
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ai runs" ON public.ai_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own ai runs" ON public.ai_runs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. AI_USAGE_WINDOWS RLS
ALTER TABLE public.ai_usage_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage windows" ON public.ai_usage_windows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own usage windows" ON public.ai_usage_windows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage windows" ON public.ai_usage_windows FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to automatically create profile on Supabase auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Municipal Officer'),
    'Municipal Officer',
    NEW.email,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
