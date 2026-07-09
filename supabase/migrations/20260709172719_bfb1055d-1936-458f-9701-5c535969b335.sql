-- Backup da linha atual antes de travar Jul/26 Modelo Atual em 520k
CREATE TABLE IF NOT EXISTS public.funnel_metas_backup_20260709_jul_modelo_atual AS
SELECT * FROM public.funnel_metas
WHERE bu = 'modelo_atual' AND month = 'Jul' AND year = 2026;

GRANT SELECT ON public.funnel_metas_backup_20260709_jul_modelo_atual TO authenticated;
GRANT ALL ON public.funnel_metas_backup_20260709_jul_modelo_atual TO service_role;
ALTER TABLE public.funnel_metas_backup_20260709_jul_modelo_atual ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view backup" ON public.funnel_metas_backup_20260709_jul_modelo_atual
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Aplicar o lock com faturamento_vender = 520000 apenas nesta linha
UPDATE public.funnel_metas
SET faturamento_vender = 520000,
    is_locked = true,
    updated_at = now()
WHERE bu = 'modelo_atual' AND month = 'Jul' AND year = 2026;