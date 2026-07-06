
-- Snapshot para rollback (só Jul/2026)
CREATE TABLE public.closer_absolute_metas_backup_20260706_jul AS
SELECT * FROM public.closer_absolute_metas WHERE month='Jul' AND year=2026;

CREATE TABLE public.sdr_metas_backup_20260706_jul_modelo_atual AS
SELECT * FROM public.sdr_metas WHERE month='Jul' AND year=2026 AND bu='modelo_atual';

GRANT SELECT ON public.closer_absolute_metas_backup_20260706_jul TO authenticated;
GRANT ALL ON public.closer_absolute_metas_backup_20260706_jul TO service_role;
GRANT SELECT ON public.sdr_metas_backup_20260706_jul_modelo_atual TO authenticated;
GRANT ALL ON public.sdr_metas_backup_20260706_jul_modelo_atual TO service_role;

ALTER TABLE public.closer_absolute_metas_backup_20260706_jul ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_metas_backup_20260706_jul_modelo_atual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read backup closer jul" ON public.closer_absolute_metas_backup_20260706_jul
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin read backup sdr jul" ON public.sdr_metas_backup_20260706_jul_modelo_atual
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Updates: Closers (Jul/2026)
UPDATE public.closer_absolute_metas
   SET rm_meta=87, rr_meta=74, prop_meta=67, venda_meta=10, faturamento_meta=220000, updated_at=now()
 WHERE closer='Daniel Trindade' AND month='Jul' AND year=2026;

UPDATE public.closer_absolute_metas
   SET rm_meta=70, rr_meta=59, prop_meta=53, venda_meta=8, faturamento_meta=100000, updated_at=now()
 WHERE closer='Amanda Serafim' AND month='Jul' AND year=2026;

UPDATE public.closer_absolute_metas
   SET rm_meta=87, rr_meta=74, prop_meta=67, venda_meta=10, faturamento_meta=200000, updated_at=now()
 WHERE closer='Thiago' AND month='Jul' AND year=2026;

-- Update: SDR Carlos (Jul/2026, modelo_atual)
UPDATE public.sdr_metas
   SET rm_meta=179, rr_meta=140, updated_at=now()
 WHERE sdr='Carlos' AND bu='modelo_atual' AND month='Jul' AND year=2026;
