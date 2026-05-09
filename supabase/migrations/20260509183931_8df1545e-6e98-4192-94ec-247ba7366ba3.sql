ALTER TABLE public.bu_indicators_config
ADD COLUMN IF NOT EXISTS investimento_planejado numeric NOT NULL DEFAULT 0;