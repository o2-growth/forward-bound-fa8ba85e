
CREATE TABLE public.dre_supplier_alias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_normalizado text UNIQUE NOT NULL,
  label_original text NOT NULL,
  pessoa_id text,
  pessoa_nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dre_supplier_alias TO authenticated;
GRANT ALL ON public.dre_supplier_alias TO service_role;

ALTER TABLE public.dre_supplier_alias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dre_supplier_alias read all authenticated"
  ON public.dre_supplier_alias FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "dre_supplier_alias insert admin"
  ON public.dre_supplier_alias FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dre_supplier_alias update admin"
  ON public.dre_supplier_alias FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dre_supplier_alias delete admin"
  ON public.dre_supplier_alias FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER dre_supplier_alias_updated_at
  BEFORE UPDATE ON public.dre_supplier_alias
  FOR EACH ROW EXECUTE FUNCTION public.update_sales_realized_updated_at();
