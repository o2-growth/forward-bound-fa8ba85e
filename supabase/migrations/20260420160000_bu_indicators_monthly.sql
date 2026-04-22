-- Add monthly support to bu_indicators_config
-- Each BU can now have different config per month

-- 1. Add month column (nullable for backward compat with existing rows)
ALTER TABLE bu_indicators_config ADD COLUMN IF NOT EXISTS month text;

-- 2. Drop old unique constraint on bu only
ALTER TABLE bu_indicators_config DROP CONSTRAINT IF EXISTS bu_indicators_config_bu_key;

-- 3. Add new unique constraint on (bu, month)
ALTER TABLE bu_indicators_config ADD CONSTRAINT bu_indicators_config_bu_month_key UNIQUE (bu, month);

-- 4. Populate monthly rows from existing annual defaults
-- For each existing BU config, create rows for Jan-Dez
DO $$
DECLARE
  months text[] := ARRAY['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  m text;
  r record;
BEGIN
  FOR r IN SELECT * FROM bu_indicators_config WHERE month IS NULL LOOP
    FOREACH m IN ARRAY months LOOP
      INSERT INTO bu_indicators_config (bu, month, ticket_medio, cpmql, cpv, mql_to_rm, rm_to_rr, rr_to_prop, prop_to_venda)
      VALUES (r.bu, m, r.ticket_medio, r.cpmql, r.cpv, r.mql_to_rm, r.rm_to_rr, r.rr_to_prop, r.prop_to_venda)
      ON CONFLICT (bu, month) DO NOTHING;
    END LOOP;
  END LOOP;
  -- Remove the old rows without month
  DELETE FROM bu_indicators_config WHERE month IS NULL;
END $$;

-- 5. Make month NOT NULL now that all rows have it
ALTER TABLE bu_indicators_config ALTER COLUMN month SET NOT NULL;
