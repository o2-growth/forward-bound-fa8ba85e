-- Adiciona coluna faturamento_meta (R$) à tabela closer_absolute_metas
-- Migration puramente aditiva: ADD COLUMN com DEFAULT 0 e NOT NULL.
-- Linhas existentes recebem 0; valores reais são definidos pelo admin
-- via a aba "Metas Closer" no dashboard.

ALTER TABLE public.closer_absolute_metas
  ADD COLUMN IF NOT EXISTS faturamento_meta numeric NOT NULL DEFAULT 0;
