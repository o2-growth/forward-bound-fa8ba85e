-- Seed dos valores de faturamento_meta para Maio/2026.
-- Autorização explícita do admin (growth@o2inc.com.br) em 25/05/2026:
--   Amanda Serafim: R$ 50.000
--   Thiago:         R$ 50.000
--   Daniel Trindade: R$ 300.000
--
-- Estratégia: usa INSERT ... ON CONFLICT DO UPDATE tocando APENAS a coluna
-- faturamento_meta. As demais (rm_meta, rr_meta, prop_meta, venda_meta)
-- ficam intactas. Demais closers / outros meses não são afetados.

INSERT INTO public.closer_absolute_metas (closer, month, year, faturamento_meta)
VALUES
  ('Amanda Serafim', 'Maio', 2026, 50000),
  ('Thiago',         'Maio', 2026, 50000),
  ('Daniel Trindade','Maio', 2026, 300000)
ON CONFLICT (closer, month, year) DO UPDATE
  SET faturamento_meta = EXCLUDED.faturamento_meta,
      updated_at = now();
