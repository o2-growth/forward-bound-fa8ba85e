
CREATE TABLE public.cost_stage_metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 2026,
  cpl NUMERIC NOT NULL DEFAULT 0,
  cpmql NUMERIC NOT NULL DEFAULT 0,
  cprm NUMERIC NOT NULL DEFAULT 0,
  cprr NUMERIC NOT NULL DEFAULT 0,
  cpp NUMERIC NOT NULL DEFAULT 0,
  cpv NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (month, year)
);

ALTER TABLE public.cost_stage_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cost stage metas"
  ON public.cost_stage_metas FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert cost stage metas"
  ON public.cost_stage_metas FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update cost stage metas"
  ON public.cost_stage_metas FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete cost stage metas"
  ON public.cost_stage_metas FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
