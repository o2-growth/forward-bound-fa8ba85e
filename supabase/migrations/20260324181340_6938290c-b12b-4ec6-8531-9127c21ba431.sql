ALTER TABLE public.daily_revenue
  ADD COLUMN caas numeric NOT NULL DEFAULT 0,
  ADD COLUMN saas numeric NOT NULL DEFAULT 0,
  ADD COLUMN expansao numeric NOT NULL DEFAULT 0,
  ADD COLUMN tax numeric NOT NULL DEFAULT 0,
  ADD COLUMN source text NOT NULL DEFAULT 'cashflow';

ALTER TABLE public.daily_revenue ADD CONSTRAINT daily_revenue_date_source_key UNIQUE (date, source);