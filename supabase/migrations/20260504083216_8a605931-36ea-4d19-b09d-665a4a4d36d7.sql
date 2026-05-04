ALTER TABLE public.funnel_metas
  ADD COLUMN IF NOT EXISTS faturamento_meta numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS faturamento_vender numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mrr_base_planejamento numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS investimento numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;