
ALTER TABLE public.monetary_metas ADD COLUMN IF NOT EXISTS vendas integer NOT NULL DEFAULT 0;
ALTER TABLE public.monetary_metas ADD COLUMN IF NOT EXISTS ticket_medio numeric NOT NULL DEFAULT 0;
