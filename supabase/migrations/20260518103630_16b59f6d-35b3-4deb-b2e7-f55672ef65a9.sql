CREATE TABLE public.closer_absolute_metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closer text NOT NULL,
  month text NOT NULL,
  year integer NOT NULL DEFAULT 2026,
  rm_meta integer NOT NULL DEFAULT 0,
  rr_meta integer NOT NULL DEFAULT 0,
  prop_meta integer NOT NULL DEFAULT 0,
  venda_meta integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (closer, month, year)
);

ALTER TABLE public.closer_absolute_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read closer absolute metas"
ON public.closer_absolute_metas FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert closer absolute metas"
ON public.closer_absolute_metas FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update closer absolute metas"
ON public.closer_absolute_metas FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete closer absolute metas"
ON public.closer_absolute_metas FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.closer_absolute_metas (closer, month, year, rm_meta, rr_meta, prop_meta, venda_meta) VALUES
  ('Daniel Trindade', 'Maio', 2026, 119, 31, 14, 6),
  ('Amanda Serafim', 'Maio', 2026, 44, 23, 10, 5),
  ('Thiago', 'Maio', 2026, 44, 23, 10, 5);
