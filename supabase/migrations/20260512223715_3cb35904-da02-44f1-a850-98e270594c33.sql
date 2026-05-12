
CREATE TABLE public.bu_indicators_config_backup_20260512_modelo_atual AS
SELECT * FROM public.bu_indicators_config
WHERE bu='modelo_atual' AND month IN ('Jan','Fev','Mar');

ALTER TABLE public.bu_indicators_config_backup_20260512_modelo_atual ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read bu_indicators_config backup"
ON public.bu_indicators_config_backup_20260512_modelo_atual
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.funnel_metas_backup_20260512_modelo_atual_v2 AS
SELECT * FROM public.funnel_metas
WHERE bu='modelo_atual' AND year=2026 AND month IN ('Jan','Fev','Mar');

ALTER TABLE public.funnel_metas_backup_20260512_modelo_atual_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read funnel_metas backup v2"
ON public.funnel_metas_backup_20260512_modelo_atual_v2
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
