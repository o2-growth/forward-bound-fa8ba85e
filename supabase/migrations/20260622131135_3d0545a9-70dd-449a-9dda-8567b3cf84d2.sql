
CREATE TABLE public.okr_metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kr_key TEXT NOT NULL,
  label TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pontos',
  direction TEXT NOT NULL DEFAULT 'gte' CHECK (direction IN ('gte','lte')),
  period TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kr_key, period)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.okr_metas TO authenticated;
GRANT ALL ON public.okr_metas TO service_role;

ALTER TABLE public.okr_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "okr_metas_read_authenticated" ON public.okr_metas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "okr_metas_admin_insert" ON public.okr_metas
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "okr_metas_admin_update" ON public.okr_metas
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "okr_metas_admin_delete" ON public.okr_metas
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.okr_metas_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_okr_metas_updated_at
  BEFORE UPDATE ON public.okr_metas
  FOR EACH ROW EXECUTE FUNCTION public.okr_metas_set_updated_at();

INSERT INTO public.okr_metas (kr_key, label, target_value, unit, direction, period, year, quarter, display_order) VALUES
  ('lt_medio',       'Manter LT acima de 8 meses',             8,   'meses',  'gte', 'Q1/2026', 2026, 1, 1),
  ('logo_churn',     'Manter Logo Churn abaixo de 5%',         5,   '%',      'lte', 'Q1/2026', 2026, 1, 2),
  ('revenue_churn',  'Manter Revenue Churn abaixo de 5%',      5,   '%',      'lte', 'Q1/2026', 2026, 1, 3),
  ('nps_score',      'Manter NPS (90-100) acima de 40',        40,  'pontos', 'gte', 'Q1/2026', 2026, 1, 4),
  ('csat_score',     'Manter CSAT acima de 80%',               80,  '%',      'gte', 'Q1/2026', 2026, 1, 5)
ON CONFLICT (kr_key, period) DO NOTHING;
