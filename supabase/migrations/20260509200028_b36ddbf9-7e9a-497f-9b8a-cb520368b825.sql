CREATE TABLE public.bu_investment_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu text NOT NULL,
  month text NOT NULL,
  year integer NOT NULL,
  investimento_anterior numeric NOT NULL DEFAULT 0,
  investimento_novo numeric NOT NULL DEFAULT 0,
  was_locked boolean NOT NULL DEFAULT false,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bu_investment_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read snapshots"
  ON public.bu_investment_snapshots FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert snapshots"
  ON public.bu_investment_snapshots FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));