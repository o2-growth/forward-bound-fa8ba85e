## Objetivo

Garantir que **todos** os painéis clicáveis (DetailSheets) de Indicadores › Comercial que hoje mostram as colunas Produto / Título / Empresa / Data / MRR / Setup / Pontual / Total / Responsável / Pipefy incluam também a coluna **"Fase Atual"** (padrão já usado em outros drill-downs, com `columnFormatters.phase`).

Já existem drill-downs onde a coluna aparece (ex.: MQL, RM, RR — linhas 642, 696, 2477, 2485, 3547 de `IndicatorsTab.tsx`). Faltam nos demais.

## Escopo

Arquivo único: `src/components/planning/IndicatorsTab.tsx`

Revisar cada um dos 11 blocos `setDetailSheetColumns([...])` e, quando a coluna `phase` estiver ausente, inseri-la **logo após** `date` (posição consistente com os que já têm):

- Linha 2199 — bloco genérico Reuniões
- Linha 2332 — bloco de Vendas/Propostas
- Linha 2698 — bloco monetário (MRR/Setup/Pontual)
- Linhas 3207, 3280, 3352, 3413, 3474 — blocos de conversão/temperatura

Também atualizar o fallback `getColumnsForIndicator` (linhas 2762-2786) para incluir `phase` em `baseColumns`, cobrindo drill-downs que caem no default.

Blocos que já têm `phase` (636, 691, 2474, 3544) ficam inalterados.

## Fora de escopo

- `TemperaturaSection.tsx` já possui a coluna (linha 137) — nada a fazer.
- `CloserPerformanceMatrix.tsx` usa Sheet próprio simplificado; não é o mesmo padrão de colunas — não alterar salvo pedido explícito.
- Nenhuma mudança de lógica, filtros, dados ou hooks. Apenas apresentação.

## Detalhe técnico

O campo `phase` já existe no tipo `DetailItem` e é populado pelos hooks de analytics (Modelo Atual, O2 TAX, Expansão). O formatter `columnFormatters.phase` já trata rótulo/badge. Inserção é aditiva; nenhuma coluna existente é removida ou reordenada além da inclusão de `phase` após `date`.
