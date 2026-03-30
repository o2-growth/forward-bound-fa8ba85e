
-- Create mrr_base_monthly table
CREATE TABLE public.mrr_base_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  year integer NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (month, year)
);

-- Enable RLS
ALTER TABLE public.mrr_base_monthly ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read mrr_base" ON public.mrr_base_monthly
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert mrr_base" ON public.mrr_base_monthly
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update mrr_base" ON public.mrr_base_monthly
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete mrr_base" ON public.mrr_base_monthly
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed data
INSERT INTO public.mrr_base_monthly (month, year, value) VALUES
  ('Jan', 2025, 54406.85),
  ('Fev', 2025, 102648.26),
  ('Mar', 2025, 102648.26),
  ('Abr', 2025, 117257.98),
  ('Mai', 2025, 124362.52),
  ('Jun', 2025, 147480.84),
  ('Jul', 2025, 194161.92),
  ('Ago', 2025, 241320.12),
  ('Set', 2025, 277084.47),
  ('Out', 2025, 307948.63),
  ('Nov', 2025, 396439.73),
  ('Dez', 2025, 453092.35),
  ('Jan', 2026, 539569.60),
  ('Fev', 2026, 607534.59),
  ('Mar', 2026, 613700.54);
