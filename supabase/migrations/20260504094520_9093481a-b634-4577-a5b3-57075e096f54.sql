-- Backup snapshot 2026-05-04 antes de implementar lock-aware metas e fix do Oxy Hacker
CREATE SCHEMA IF NOT EXISTS backups;

CREATE TABLE backups.monetary_metas_2026_05_04 AS SELECT * FROM public.monetary_metas;
CREATE TABLE backups.funnel_metas_2026_05_04 AS SELECT * FROM public.funnel_metas;
CREATE TABLE backups.mrr_base_monthly_2026_05_04 AS SELECT * FROM public.mrr_base_monthly;
CREATE TABLE backups.bu_indicators_config_2026_05_04 AS SELECT * FROM public.bu_indicators_config;