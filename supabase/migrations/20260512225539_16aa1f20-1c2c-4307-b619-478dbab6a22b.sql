CREATE TABLE IF NOT EXISTS public.funnel_metas_backup_20260512_v3_pre_churn AS
  SELECT * FROM public.funnel_metas;

CREATE TABLE IF NOT EXISTS public.bu_indicators_config_backup_20260512_v2_pre_churn AS
  SELECT * FROM public.bu_indicators_config;

CREATE TABLE IF NOT EXISTS public.mrr_base_monthly_backup_20260512_pre_churn AS
  SELECT * FROM public.mrr_base_monthly;

ALTER TABLE public.funnel_metas_backup_20260512_v3_pre_churn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bu_indicators_config_backup_20260512_v2_pre_churn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mrr_base_monthly_backup_20260512_pre_churn ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read funnel_metas backup v3" ON public.funnel_metas_backup_20260512_v3_pre_churn
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can read bu_indicators_config backup v2" ON public.bu_indicators_config_backup_20260512_v2_pre_churn
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can read mrr_base_monthly backup" ON public.mrr_base_monthly_backup_20260512_pre_churn
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));