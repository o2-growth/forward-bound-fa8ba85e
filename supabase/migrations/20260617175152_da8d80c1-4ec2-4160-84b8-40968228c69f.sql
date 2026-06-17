CREATE TABLE public.personnel_dre_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dre_label text NOT NULL,
  dre_label_original text NOT NULL,
  group_id text,
  group_label text,
  pessoa_id text,
  pessoa_nome text,
  pessoa_time text,
  tipo text NOT NULL DEFAULT 'outro',
  is_ignored boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE UNIQUE INDEX personnel_dre_mapping_label_uniq ON public.personnel_dre_mapping(dre_label);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personnel_dre_mapping TO authenticated;
GRANT ALL ON public.personnel_dre_mapping TO service_role;

ALTER TABLE public.personnel_dre_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read personnel_dre_mapping"
ON public.personnel_dre_mapping FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert personnel_dre_mapping"
ON public.personnel_dre_mapping FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update personnel_dre_mapping"
ON public.personnel_dre_mapping FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete personnel_dre_mapping"
ON public.personnel_dre_mapping FOR DELETE TO authenticated USING (true);

CREATE TRIGGER personnel_dre_mapping_set_updated_at
BEFORE UPDATE ON public.personnel_dre_mapping
FOR EACH ROW EXECUTE FUNCTION public.update_sales_realized_updated_at();