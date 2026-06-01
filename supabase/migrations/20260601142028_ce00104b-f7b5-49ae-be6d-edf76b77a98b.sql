-- Tabela para guardar snapshots de leituras semanais de insights comerciais
CREATE TABLE public.commercial_insights_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  label text,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_insights_snapshots TO authenticated;
GRANT ALL ON public.commercial_insights_snapshots TO service_role;

ALTER TABLE public.commercial_insights_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own insight snapshots"
  ON public.commercial_insights_snapshots
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own insight snapshots"
  ON public.commercial_insights_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own insight snapshots"
  ON public.commercial_insights_snapshots
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_commercial_insights_snapshots_user_generated
  ON public.commercial_insights_snapshots (user_id, generated_at DESC);
