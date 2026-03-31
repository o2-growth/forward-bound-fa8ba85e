CREATE TABLE IF NOT EXISTS public.meta_redistribution_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  total_before numeric NOT NULL DEFAULT 0,
  total_after numeric NOT NULL DEFAULT 0,
  changes_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meta_redistribution_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.meta_redistribution_sessions(id) ON DELETE CASCADE,
  bu text NOT NULL,
  month text NOT NULL,
  year integer NOT NULL DEFAULT 2026,
  field text NOT NULL,
  value_before numeric NOT NULL DEFAULT 0,
  value_after numeric NOT NULL DEFAULT 0,
  delta numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_redistribution_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_redistribution_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sessions"
  ON public.meta_redistribution_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read changes"
  ON public.meta_redistribution_changes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert sessions"
  ON public.meta_redistribution_sessions FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update sessions"
  ON public.meta_redistribution_sessions FOR UPDATE TO service_role USING (true);

CREATE POLICY "Service role can insert changes"
  ON public.meta_redistribution_changes FOR INSERT TO service_role WITH CHECK (true);