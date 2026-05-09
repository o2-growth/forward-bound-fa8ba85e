## Garantias de não-perda

Antes de qualquer alteração, salvar 3 backups em `/mnt/documents/`:

1. `mrr_base_monthly_pre-projetado-real_2026-05-09.csv` — todas as linhas (Oxy real intocada).
2. `funnel_metas_modelo_atual_pre-projetado-real_2026-05-09.csv` — Jan-Dez/26 modelo_atual.
3. `usePlanGrowthData.ts.bak-2026-05-09` e `MediaInvestmentTab.tsx.bak-2026-05-09` — cópias dos arquivos antes da edição.

Validação pós-backup: `wc -l` em cada CSV + comparar contagem com `SELECT COUNT(*)` antes de prosseguir.

Apenas após confirmar os 3 backups, executar os passos.

## Diagnóstico (resumo)

- `mrr_base_monthly` = MRR Real (Oxy). **Não tocar.**
- `funnel_metas.mrr_base_planejamento` = deveria ser o **Projetado**, mas o auto-lock e o override em `usePlanGrowthData.ts:558` estão jogando Oxy ali. Por isso Jan-Mai mostram Oxy ao invés do plano.
- A regra de gap (projetado − real) → "a vender" de Dez já existe (`usePlanGrowthData.ts:438-466`) e fica preservada.
- A UI já tem o badge "Projetado / Real (Oxy) / Δ" por mês em `MediaInvestmentTab.tsx:670-690`.

## Passo 1 — Código (`src/hooks/usePlanGrowthData.ts`)

a) Adicionar constante de seed projetado:
```ts
const MRR_PROJECTED_SEED_DEZ_2025 = 725000;
```

b) `mrrInicial` (linha 350-353): trocar leitura de `mrrBaseRealPorMes['Jan']` por `MRR_PROJECTED_SEED_DEZ_2025`. Comentário deixa claro: "Seed do plano, decoupled da Oxy real".

c) Remover override (linha 555-560) que substitui `mrrBase` projetado pela Oxy real. O campo `mrrBase` em `modeloAtualFunnel` passa a representar **sempre o projetado**. Real continua disponível em `mrrBaseRealPorMes` para o badge de gap.

d) Auto-lock (linha 641-655): permanece igual — agora `row.mrrBase` é o projetado verdadeiro, então `funnel_metas.mrr_base_planejamento` recebe o plano correto em futuros locks.

e) Regra de gap (438-466): mantida intacta — continua mandando o saldo positivo para `revenueToSell['Dez']`.

## Passo 2 — Código (`src/components/planning/MediaInvestmentTab.tsx`)

Bloco linhas 1364-1421: ajustar para refletir que `d.mrrBase` agora é projetado puro.
- `mrrShown` na coluna principal = `d.mrrBase` (projetado).
- `mrrBaseProjetado` continua = `d.mrrBase`.
- `mrrBaseGap` = `projetado − realMrr` (sem mudança de fórmula, só de fonte).
- Badge no expandido continua mostrando os três valores.

## Passo 3 — Banco (corrigir snapshots já salvos)

Atualizar `funnel_metas.mrr_base_planejamento` modelo_atual Jan-Mai/26 para os valores projetados confirmados:

```sql
UPDATE public.funnel_metas SET mrr_base_planejamento=725000.00,    updated_at=now() WHERE bu='modelo_atual' AND year=2026 AND month='Jan';
UPDATE public.funnel_metas SET mrr_base_planejamento=781500.00,    updated_at=now() WHERE bu='modelo_atual' AND year=2026 AND month='Fev';
UPDATE public.funnel_metas SET mrr_base_planejamento=834610.00,    updated_at=now() WHERE bu='modelo_atual' AND year=2026 AND month='Mar';
UPDATE public.funnel_metas SET mrr_base_planejamento=909533.00,    updated_at=now() WHERE bu='modelo_atual' AND year=2026 AND month='Abr';
UPDATE public.funnel_metas SET mrr_base_planejamento=1004961.00,   updated_at=now() WHERE bu='modelo_atual' AND year=2026 AND month='Mai';
```

`mrr_base_monthly` **não é tocada**.

## Passo 4 — Validação visual

- Conferir Plan Growth/Investimento: Jan=725k, Fev=781,5k, Mar=834,6k, Abr=909,5k, Mai=1.004,9k.
- Cada mês com badge "Projetado / Real (Oxy) / Δ".
- Saldo positivo dos gaps somado em "a vender" de Dezembro modelo_atual (verificar console: `[GapMRR ModeloAtual]`).
- Outras BUs sem alterações.

## Reversão

- Código: restaurar dos `.bak`.
- Banco:
```sql
UPDATE public.funnel_metas SET mrr_base_planejamento=622468.60 WHERE bu='modelo_atual' AND year=2026 AND month='Jan';
UPDATE public.funnel_metas SET mrr_base_planejamento=705268.07 WHERE bu='modelo_atual' AND year=2026 AND month='Fev';
UPDATE public.funnel_metas SET mrr_base_planejamento=746847.17 WHERE bu='modelo_atual' AND year=2026 AND month='Mar';
UPDATE public.funnel_metas SET mrr_base_planejamento=733281.13 WHERE bu='modelo_atual' AND year=2026 AND month='Abr';
UPDATE public.funnel_metas SET mrr_base_planejamento=700152.57 WHERE bu='modelo_atual' AND year=2026 AND month='Mai';
```

Ou via History do Lovable para o código.

## Fora de escopo

- Sync Oxy permanece ativo e intocado.
- Outras BUs (O2 TAX, Oxy Hacker, Franquia) sem alterações.
- Seed projetado fica hardcoded (725k); editar via UI fica para tarefa futura.
- Atualização de memória do projeto somente após validação visual.
