---
name: Sales + RM Monthly Dedup
description: Dedup adicional de venda (id+mês prefere Ganho) e RM (titulo normalizado+mês) em Modelo Atual e O2 TAX
type: logic
---
## Venda
Dedup adicional por `(card.id, mês-da-data-efetiva)` preferindo `Ganho` sobre `Contrato assinado`. Mesmo card passa pelas 2 fases finais no mesmo mês — sem dedup, conta 2x.

## RM (Reunião agendada / Qualificado)
Dedup adicional por `(normalize(titulo), mês-da-dataEntrada)` em `indicator='rm'`. Mesmo cliente recadastrado/reaberto como **card distinto no Pipefy** (IDs diferentes) no mesmo mês conta 1x.

- `normalize` = trim + lowercase + NFD sem acentos
- Empate: prefere `dataEntrada` mais recente; se mesma data, menor ID
- Cards sem título caem em chave única por ID (não deduplicam)

**Aplicado em:**
- `src/hooks/useModeloAtualAnalytics.ts` → `getCardsForIndicator('rm' | 'venda')`
- `src/hooks/useO2TaxAnalytics.ts` → `getCardsForIndicator('rm' | 'venda')`
- Expansão: dedup natural via `monthlyFirstEntries` (não precisa)

**Não muda:** Leads, MQL, RR, Proposta, valores monetários, metas.

**Validação Jun/2026 Modelo Atual:** 42 RMs → ~38 (dedup de Kopu, Núcleo, José Edson, G4 Pic pay).
