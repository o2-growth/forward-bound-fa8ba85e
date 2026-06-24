## Objetivo

Adicionar um bloco **Funil de Monetização** na aba Indicadores → Comercial, lendo do pipe `pipefy_moviment_contrato` já sincronizado no banco externo. Só realizado, sem metas.

## Pipe identificado

Tabela: `pipefy_moviment_contrato` (no EXTERNAL_PG).

**Tipos de movimentação** (campo `tipo_de_movimenta_o`):
- Novo produto · Troca de produto · Upsell · Downsell

**Fases** (campo `Fase`, ordem do funil):
1. Start form
2. Oportunidade Levantada
3. Proposta em Elaboração
4. Proposta enviada / Follow Up
5. Aprovado pelo Cliente
6. Jurídico
7. Faturamento
8. Concluído (= ganho)

Campos de valor (somar para "valor total do card"):
`valor_cfoaas`, `valor_setup`, `valor_oxy`, `valor_diagn_stico`, `valor_turnaround`, `valor_valuation`, `valor_assessoria_mrr`, `valor_bpo`, `valor_coordenador_financeiro`, `valor_educa_o`.

Outros campos relevantes: `Título`, `cliente`, `produto`, `Fase Atual`, `Entrada`, `motivo_da_perda`, `status_da_proposta`, `respons_vel`.

A tabela é de **movimentos** (mesmo card aparece N vezes). Dedup por `ID` mantendo a linha mais recente por `Entrada` (e usar `Fase Atual` como fase corrente).

## O que mudar

### 1. Backend — liberar acesso à tabela
`supabase/functions/query-external-db/index.ts` — adicionar `"pipefy_moviment_contrato"` à constante `validTables`. Sem nova edge function: já reutilizamos `action: 'raw_sql'` (ou `preview`) existente.

### 2. Novo hook — `src/hooks/useMonetizacaoAnalytics.ts`
- Query única via `supabase.functions.invoke('query-external-db', { table: 'pipefy_moviment_contrato', action: 'raw_sql', sql: '...' })` puxando todos os campos relevantes no período (`Entrada BETWEEN`).
- Cache via `@tanstack/react-query` (mesmo padrão dos outros analytics).
- Dedup por `ID` (linha mais recente por `Entrada`).
- Helpers calculados:
  - `valorTotal` = soma de todos os `valor_*`.
  - `tipo` = `tipo_de_movimenta_o`.
  - `faseAtual` = `Fase Atual` (fallback `Fase`).
  - `ganho` = `faseAtual === 'Concluído'` ou `status_da_proposta` ganho.
  - `perdido` = presença de `motivo_da_perda`.
- Exports:
  - `cards` (lista deduplicada)
  - `byFase` (contagem + valor por fase, na ordem canônica do funil)
  - `byTipo` (contagem + valor por Upsell / Cross-sell≈Novo produto / Troca de produto / Downsell)
  - `totals` (cards, valor total em pipeline, valor ganho/concluído)
  - `toDetailItem(card)` para abrir DetailSheet
  - `isLoading`

### 3. Novo componente — `src/components/planning/indicators/MonetizacaoSection.tsx`
Card colapsável com:
- **Header**: 💎 Funil de Monetização + descrição (escopo da seção = pipe `Monetização`, não respeita o filtro de BU do dashboard porque é um pipe transversal; respeita só o período).
- **KPIs topo** (linha de 4 chips): Total de cards · Valor em pipeline · Valor concluído · Ticket médio.
- **Mini-funil por fase**: chips clicáveis por fase (Start form → Concluído) mostrando contagem + valor. Clique abre DetailSheet com os cards daquela fase.
- **Quebra por tipo de movimentação**: 4 chips coloridos (Novo produto, Upsell, Cross-sell, Troca de produto, Downsell — usar mapping de `tipo_de_movimenta_o`). Clicáveis também.
- **DetailSheet** comum (`DetailItem`): colunas Empresa (`Título`), Tipo, Produto, Fase Atual, Valor total, Responsável, Entrada. Link Pipefy.

Se a query retornar `0` cards no período, renderiza msg vazia em vez de esconder (pra deixar claro que existe a seção e o filtro pode estar errado).

### 4. Wiring no IndicatorsTab
- Importar `MonetizacaoSection` em `src/components/planning/IndicatorsTab.tsx`.
- Renderizar logo abaixo do `CenarioCaixaSection`, passando apenas `startDate` e `endDate` (independe de `selectedBUs`).

### 5. Sem mudanças em metas/banco
Conforme pedido, apenas realizado. Sem migration. Sem alteração em `monetary_metas`, `funnel_metas`, etc.

## Detalhes técnicos

- Período: filtro por `Entrada` (data do card no pipe). Como a tabela é de movimentos, fazemos `SELECT * WHERE Entrada >= start AND Entrada <= end` e dedup client-side.
- Mapeamento Upsell ≈ Upsell, Cross-sell ≈ `Novo produto` (validar com você na primeira renderização — fácil de trocar se preferir mapear diferente).
- Valor monetário: somatório de todos os `valor_*` por card. Para cards com valores em MRR (cfoaas/assessoria), tratamos como valor mensal (1×) — coerente com o resto do dash.

## Arquivos afetados

- `supabase/functions/query-external-db/index.ts` — incluir tabela na whitelist
- `src/hooks/useMonetizacaoAnalytics.ts` — **novo**
- `src/components/planning/indicators/MonetizacaoSection.tsx` — **novo**
- `src/components/planning/IndicatorsTab.tsx` — mount do bloco
