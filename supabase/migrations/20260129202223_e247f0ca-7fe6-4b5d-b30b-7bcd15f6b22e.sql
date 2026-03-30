-- Create table for monetary metas (Faturamento, MRR, Setup, Pontual) per BU/month
CREATE TABLE public.monetary_metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu text NOT NULL,
  month text NOT NULL,
  year integer NOT NULL DEFAULT 2026,
  faturamento numeric DEFAULT 0,
  mrr numeric DEFAULT 0,
  setup numeric DEFAULT 0,
  pontual numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bu, month, year)
);

-- Enable RLS
ALTER TABLE public.monetary_metas ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated users can read monetary metas"
ON public.monetary_metas
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can insert
CREATE POLICY "Only admins can insert monetary metas"
ON public.monetary_metas
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Only admins can update monetary metas"
ON public.monetary_metas
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Only admins can delete monetary metas"
ON public.monetary_metas
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_monetary_metas_updated_at
BEFORE UPDATE ON public.monetary_metas
FOR EACH ROW
EXECUTE FUNCTION public.update_sales_realized_updated_at();