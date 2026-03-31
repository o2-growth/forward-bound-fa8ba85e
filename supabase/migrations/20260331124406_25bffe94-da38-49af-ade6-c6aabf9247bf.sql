
CREATE TABLE IF NOT EXISTS public.funnel_metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu text NOT NULL,
  month text NOT NULL,
  year integer NOT NULL DEFAULT 2026,
  leads integer NOT NULL DEFAULT 0,
  mqls integer NOT NULL DEFAULT 0,
  rms integer NOT NULL DEFAULT 0,
  rrs integer NOT NULL DEFAULT 0,
  propostas integer NOT NULL DEFAULT 0,
  vendas integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bu, month, year)
);

ALTER TABLE public.funnel_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read funnel metas"
  ON public.funnel_metas FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert funnel metas"
  ON public.funnel_metas FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update funnel metas"
  ON public.funnel_metas FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete funnel metas"
  ON public.funnel_metas FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
