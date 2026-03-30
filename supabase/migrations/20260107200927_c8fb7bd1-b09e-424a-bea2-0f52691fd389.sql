-- Create table for funnel data from Pipefy
CREATE TABLE public.funnel_realized (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu TEXT NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 2026,
  indicator TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bu, month, year, indicator)
);

-- Enable Row Level Security
ALTER TABLE public.funnel_realized ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read funnel data"
  ON public.funnel_realized
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert funnel data"
  ON public.funnel_realized
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can update funnel data"
  ON public.funnel_realized
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete funnel data"
  ON public.funnel_realized
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_funnel_realized_updated_at
  BEFORE UPDATE ON public.funnel_realized
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sales_realized_updated_at();