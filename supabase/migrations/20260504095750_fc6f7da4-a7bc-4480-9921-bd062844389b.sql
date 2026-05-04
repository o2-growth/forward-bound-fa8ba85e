CREATE TABLE public.sdr_metas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu text NOT NULL,
  month text NOT NULL,
  year integer NOT NULL DEFAULT 2026,
  sdr text NOT NULL,
  rm_meta integer NOT NULL DEFAULT 0,
  rr_meta integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bu, month, year, sdr)
);

ALTER TABLE public.sdr_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sdr metas"
ON public.sdr_metas FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert sdr metas"
ON public.sdr_metas FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update sdr metas"
ON public.sdr_metas FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete sdr metas"
ON public.sdr_metas FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER sdr_metas_audit
AFTER INSERT OR UPDATE OR DELETE ON public.sdr_metas
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

CREATE TRIGGER sdr_metas_set_updated_at
BEFORE UPDATE ON public.sdr_metas
FOR EACH ROW EXECUTE FUNCTION public.update_sales_realized_updated_at();

CREATE INDEX idx_sdr_metas_bu_month_year ON public.sdr_metas(bu, month, year);
CREATE INDEX idx_sdr_metas_sdr ON public.sdr_metas(sdr);