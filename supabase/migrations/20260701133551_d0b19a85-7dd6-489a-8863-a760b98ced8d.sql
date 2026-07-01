CREATE TABLE public.event_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (year, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_investments TO authenticated;
GRANT ALL ON public.event_investments TO service_role;

ALTER TABLE public.event_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_event_investments"
  ON public.event_investments FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_insert_event_investments"
  ON public.event_investments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_event_investments"
  ON public.event_investments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_delete_event_investments"
  ON public.event_investments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER event_investments_set_updated_at
  BEFORE UPDATE ON public.event_investments
  FOR EACH ROW EXECUTE FUNCTION public.okr_metas_set_updated_at();

-- Seed Jan–Jun/2026 with historical R$ 25k baseline (idempotent)
INSERT INTO public.event_investments (year, month, valor, descricao) VALUES
  (2026, 1, 25000, 'Baseline histórico'),
  (2026, 2, 25000, 'Baseline histórico'),
  (2026, 3, 25000, 'Baseline histórico'),
  (2026, 4, 25000, 'Baseline histórico'),
  (2026, 5, 25000, 'Baseline histórico'),
  (2026, 6, 25000, 'Baseline histórico')
ON CONFLICT (year, month) DO NOTHING;