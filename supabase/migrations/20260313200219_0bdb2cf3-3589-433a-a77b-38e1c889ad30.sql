
CREATE TABLE public.daily_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_inflows numeric NOT NULL DEFAULT 0,
  customer_count integer NOT NULL DEFAULT 0,
  year integer NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily_revenue"
  ON public.daily_revenue FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage daily_revenue"
  ON public.daily_revenue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
