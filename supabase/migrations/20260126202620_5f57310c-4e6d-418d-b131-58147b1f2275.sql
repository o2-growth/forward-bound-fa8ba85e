-- Create closer_metas table for storing closer percentage responsibilities
CREATE TABLE public.closer_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu TEXT NOT NULL,
  month TEXT NOT NULL,
  closer TEXT NOT NULL,
  percentage NUMERIC NOT NULL DEFAULT 50 CHECK (percentage >= 0 AND percentage <= 100),
  year INTEGER NOT NULL DEFAULT 2026,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (bu, month, closer, year)
);

-- Enable RLS
ALTER TABLE public.closer_metas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read closer metas"
ON public.closer_metas
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert closer metas"
ON public.closer_metas
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update closer metas"
ON public.closer_metas
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete closer metas"
ON public.closer_metas
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create update trigger for updated_at
CREATE TRIGGER update_closer_metas_updated_at
BEFORE UPDATE ON public.closer_metas
FOR EACH ROW
EXECUTE FUNCTION public.update_sales_realized_updated_at();

-- Seed initial data: 50% for each closer for all BU/month combinations
INSERT INTO public.closer_metas (bu, month, closer, percentage, year)
SELECT 
  bu,
  month,
  closer,
  50 as percentage,
  2026 as year
FROM 
  unnest(ARRAY['modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia']) as bu,
  unnest(ARRAY['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']) as month,
  unnest(ARRAY['Pedro Albite', 'Daniel Trindade']) as closer;