-- Create table for caching Meta Ads API responses
CREATE TABLE public.meta_ads_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Create indexes for efficient lookups
CREATE INDEX idx_meta_ads_cache_key ON public.meta_ads_cache(cache_key);
CREATE INDEX idx_meta_ads_cache_expires ON public.meta_ads_cache(expires_at);

-- Enable RLS
ALTER TABLE public.meta_ads_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read cache
CREATE POLICY "Authenticated users can read cache" 
ON public.meta_ads_cache 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert/update cache (via Edge Functions with service role)
CREATE POLICY "Service role can manage cache" 
ON public.meta_ads_cache 
FOR ALL
USING (true)
WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE public.meta_ads_cache IS 'Cache for Meta Ads API responses with TTL to reduce rate limit errors';