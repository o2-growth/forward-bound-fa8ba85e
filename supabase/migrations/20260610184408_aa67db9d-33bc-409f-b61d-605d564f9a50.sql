
CREATE TABLE public.cliente_slack_channels (
  cliente_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  set_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_slack_channels TO authenticated;
GRANT ALL ON public.cliente_slack_channels TO service_role;

ALTER TABLE public.cliente_slack_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read slack channel overrides"
  ON public.cliente_slack_channels FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert slack channel overrides"
  ON public.cliente_slack_channels FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update slack channel overrides"
  ON public.cliente_slack_channels FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete slack channel overrides"
  ON public.cliente_slack_channels FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_cliente_slack_channels_updated
  BEFORE UPDATE ON public.cliente_slack_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_sales_realized_updated_at();
