CREATE TABLE public.personnel_dre_groups_config (
  id integer PRIMARY KEY DEFAULT 1,
  group_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT singleton_personnel_dre_groups CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON public.personnel_dre_groups_config TO authenticated;
GRANT ALL ON public.personnel_dre_groups_config TO service_role;

ALTER TABLE public.personnel_dre_groups_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read personnel dre groups"
ON public.personnel_dre_groups_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert personnel dre groups"
ON public.personnel_dre_groups_config FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update personnel dre groups"
ON public.personnel_dre_groups_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.personnel_dre_groups_config (id, group_ids) VALUES (1, '[]'::jsonb) ON CONFLICT DO NOTHING;