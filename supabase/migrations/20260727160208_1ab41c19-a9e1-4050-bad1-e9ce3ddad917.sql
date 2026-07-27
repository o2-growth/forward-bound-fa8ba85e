CREATE TABLE public.g4_metrics_cache (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.g4_metrics_cache TO anon;
GRANT SELECT ON public.g4_metrics_cache TO authenticated;
GRANT ALL ON public.g4_metrics_cache TO service_role;
ALTER TABLE public.g4_metrics_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "g4 cache readable by everyone" ON public.g4_metrics_cache FOR SELECT USING (true);