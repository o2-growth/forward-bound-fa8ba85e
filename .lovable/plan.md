## Objetivo
Garantir que O2 TAX e Oxy Hacker exibam Investimento = R$ 0 nos meses de Mar a Dez/2026 no Plan Growth, sem afetar Modelo Atual, Franquia ou qualquer outro indicador (MRR Base, A Vender, leads, MQLs, RMs, RRs, propostas, vendas, faturamento, pontual).

## Etapa 1 — Backups (antes de qualquer alteração)

**1a. Backup do código**
- Copiar `src/components/planning2026/MediaInvestmentTab.tsx` para `src/components/planning2026/MediaInvestmentTab.tsx.bak-zero-investment-2026-05-09`.

**1b. Backup do banco**
- Criar schema `backups` (se não existir) e tabela `backups.funnel_metas_2026_05_09_pre_zero` com cópia integral dos registros de `public.funnel_metas WHERE year = 2026`.
- Permite rollback rápido via `UPDATE funnel_metas SET investimento = b.investimento FROM backups.funnel_metas_2026_05_09_pre_zero b WHERE ...`.

## Etapa 2 — Ajuste cirúrgico no display

No `MediaInvestmentTab.tsx`, na construção dos funis de O2 TAX e Oxy Hacker:
- Ler `funnel_metas` para a BU/mês.
- Se `investimento = 0` e `is_locked = false` → forçar `investimento: 0` no objeto exibido.
- Caso contrário, manter o cálculo atual.

Escopo restrito a `o2TaxFunnel` e `oxyHackerFunnel`. `modeloAtualFunnel` e `franquiaFunnel` permanecem intactos. Os agregados (Investimento Total, gráfico mensal, pizza, cards de BU, `setFunnelData`) já derivam dos funis de BU, então refletem automaticamente.

## Etapa 3 — Validação
- Confirmar visualmente Mar a Dez/2026: O2 TAX e Oxy Hacker mostram R$ 0 de Investimento.
- Confirmar Modelo Atual e Franquia inalterados.
- Confirmar que nenhum outro campo (MRR Base, A Vender, MQLs, vendas etc.) mudou.

## Garantias
- Apenas O2 TAX e Oxy Hacker afetados.
- Nenhuma alteração em `monetary_metas`, `mrr_base_monthly`, `closer_metas`, `sdr_metas`, `funnel_realized`.
- Rollback disponível via backup de código (`.bak-*`) e backup de DB (`backups.funnel_metas_2026_05_09_pre_zero`).
