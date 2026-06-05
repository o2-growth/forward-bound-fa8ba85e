---
name: Sales Monthly Card Deduplication
description: Vendas (Contrato assinado + Ganho) deduplicadas por id+mês preferindo 'Ganho' em todos os analytics
type: logic
---
Para contagem e drill-down de **venda** (indicator='venda'), aplicar deduplicação adicional por `(card.id, mês-da-data-efetiva)` preferindo a linha de `Ganho` sobre `Contrato assinado`.

**Motivo:** o pipe do Pipefy tem 2 fases finais (`Contrato assinado` → `Ganho`). Um mesmo card pode passar pelas duas no mesmo mês — sem a dedup, conta 2x.

**Aplicado em:**
- `src/hooks/useModeloAtualAnalytics.ts` → `getCardsForIndicator('venda')`
- `src/hooks/useO2TaxAnalytics.ts` → `getCardsForIndicator('venda')`
- `src/hooks/useExpansaoAnalytics.ts` → já fazia naturalmente via `monthlyFirstEntries` (dedupKey = `card+indicator+month`)
- `useOxyHackerMetas`, `useClosersMetas`, demais Metas hooks → já mapeavam só uma fase ('Contrato assinado' ou 'Ganho'), sem risco

**Não muda:**
- Valores monetários (MRR/Setup/Pontual) — agregam só de 'Ganho' (Modelo Atual/O2 TAX) ou 'Contrato assinado' (Expansão)
- Funil das outras fases (Leads, MQL, RM, RR, Proposta) — dedup por `id|fase|mês` permanece
- Data efetiva continua sendo `Data de assinatura do contrato` quando preenchida

**Validação:** Modelo Atual Maio/26 caiu de 33 → 19 movimentações no drill-down de venda.
