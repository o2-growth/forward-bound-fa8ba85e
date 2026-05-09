CREATE SCHEMA IF NOT EXISTS backups;
DROP TABLE IF EXISTS backups.funnel_metas_2026_05_09_pre_zero;
CREATE TABLE backups.funnel_metas_2026_05_09_pre_zero AS
SELECT * FROM public.funnel_metas WHERE year = 2026;