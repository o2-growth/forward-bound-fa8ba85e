---
name: Monetary Gauges Closer Filter
description: Closer filter applies to realized AND meta of monetary gauges across all BUs (rateio via closer_metas %), com guard de closer_absolute_metas
type: logic
---
O filtro de closer afeta tanto realizado quanto meta dos acelerômetros (monetários e de funil — MQL/RM/RR/Prop/Venda).

A meta filtrada usa `closer_metas.percentage(closer, bu, mês)` como rateio sobre a meta base da BU.

**Guard obrigatório (não remover):** o rateio só é aplicado para closers que possuem ao menos uma linha em `closer_absolute_metas` para o mês em questão (qualquer campo rm/rr/prop/venda/faturamento > 0). Closers sem nenhuma meta absoluta cadastrada no mês são descartados do `selectedClosers` antes da soma de percentuais. Se nenhum closer válido restar → meta filtrada = 0.

**Por quê:** o `closer_metas` legado pode ter rateio antigo (ex.: Pedro 100% em Oxy Hacker) mesmo após o admin remover o closer da fonte oficial (`closer_absolute_metas`). Sem o guard, filtrar esse closer mostra meta > 0 quando deveria mostrar 0.

**Onde:** `src/hooks/useCloserMetas.ts` → `getFilteredMeta`, índice `absoluteMetaIndex` montado a partir de `useCloserAbsoluteMetas`.
