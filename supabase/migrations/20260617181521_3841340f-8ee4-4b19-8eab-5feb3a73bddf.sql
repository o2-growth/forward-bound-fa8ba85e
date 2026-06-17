ALTER TABLE public.personnel_dre_mapping
  ADD COLUMN IF NOT EXISTS team_split JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.personnel_dre_mapping.team_split IS 'Distribuição percentual da categoria entre Times. Ex: { "Comercial": 35, "Tech": 30, "Ops": 35 }. Soma deve ser 100 quando mapeada.';