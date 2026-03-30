-- Meta redistribution sessions and changes
-- Allows tracking of all changes to monetary_metas with rollback capability

-- Sessions: each time an admin saves redistribution changes
CREATE TABLE IF NOT EXISTS public.meta_redistribution_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    description TEXT, -- e.g. "Redistribuição gap Q1 MA para O2 Tax Q2"
    total_before NUMERIC NOT NULL, -- sum of all metas before changes
    total_after NUMERIC NOT NULL, -- sum after (must equal total_before)
    changes_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- false if rolled back
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual changes within a session
CREATE TABLE IF NOT EXISTS public.meta_redistribution_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.meta_redistribution_sessions(id) ON DELETE CASCADE,
    bu TEXT NOT NULL, -- modelo_atual, o2_tax, oxy_hacker, franquia
    month TEXT NOT NULL, -- Jan, Fev, Mar, etc
    year INTEGER NOT NULL DEFAULT 2026,
    field TEXT NOT NULL DEFAULT 'faturamento', -- which field changed
    value_before NUMERIC NOT NULL,
    value_after NUMERIC NOT NULL,
    delta NUMERIC NOT NULL, -- value_after - value_before
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_redistribution_sessions_user ON public.meta_redistribution_sessions(user_id);
CREATE INDEX idx_redistribution_sessions_active ON public.meta_redistribution_sessions(is_active);
CREATE INDEX idx_redistribution_changes_session ON public.meta_redistribution_changes(session_id);

-- RLS
ALTER TABLE public.meta_redistribution_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_redistribution_changes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage redistribution sessions"
    ON public.meta_redistribution_sessions
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage redistribution changes"
    ON public.meta_redistribution_changes
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- All authenticated users can read
CREATE POLICY "Authenticated users can read sessions"
    ON public.meta_redistribution_sessions
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read changes"
    ON public.meta_redistribution_changes
    FOR SELECT
    USING (auth.role() = 'authenticated');
