CREATE TABLE IF NOT EXISTS public.funnel_metas_backup_20260512 AS
SELECT * FROM public.funnel_metas;

ALTER TABLE public.funnel_metas_backup_20260512 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read funnel_metas backup"
ON public.funnel_metas_backup_20260512
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));