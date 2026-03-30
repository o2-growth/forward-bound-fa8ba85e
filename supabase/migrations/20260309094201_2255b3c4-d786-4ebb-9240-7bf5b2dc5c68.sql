ALTER TABLE public.mrr_base_monthly ADD COLUMN is_total_override boolean NOT NULL DEFAULT false;

UPDATE public.mrr_base_monthly SET value = 967968.89, is_total_override = true WHERE month = 'Jan' AND year = 2026;
UPDATE public.mrr_base_monthly SET value = 809975.81, is_total_override = true WHERE month = 'Fev' AND year = 2026;