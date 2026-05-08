## Plano: Corrigir snapshot de Maio com backup

### Etapa 1 — Backup
Exportar estado atual de `funnel_metas` para `/mnt/documents/funnel_metas_backup_pre-fix_2026-05-08.csv`.

### Etapa 2 — Limpar Maio
`DELETE` das 4 linhas de `funnel_metas` onde `year=2026 AND month='Mai'`.

### Etapa 3 — Corrigir auto-lock em `usePlanGrowthData.ts`
- Expor `isLoading` em `useMrrBase` e aguardar no `useEffect`.
- Substituir hardcodes por valores reais do DB:
  - `mrrInicial` = `mrr_base_monthly` de Dez/2025.
  - `valorVenderInicial` = `funnel_metas.faturamento_vender` de Jan/2026 (Modelo Atual).
- Manter guard `hasAutoLocked` para rodar uma vez por sessão.

### Etapa 4 — Validar
Recarregar o app → conferir que `funnel_metas` Maio/2026 grava ~537 MQLs em Modelo Atual e total batendo com Plan Growth.

### Rollback
Se algo der errado: restaurar via CSV de backup com `UPSERT`.
