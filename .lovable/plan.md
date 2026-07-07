## Causa raiz

Nos acelerômetros de **Franquia** e **Oxy Hacker** (Expansão), o gráfico/coluna "Faixa de Faturamento" aparece sempre como **Não informado / null**. Não é falta de dado no Pipefy — os cards têm a coluna preenchida.

O que acontece:

1. `useExpansaoAnalytics.ts` (linha 559) já popula corretamente `revenueRange` a partir da coluna Pipefy **`Investimento disponível`** (ex.: `"Menos de 5 mil reais"`, `"Entre 5 e 15 mil"`, etc.) — taxonomia própria de Expansão.
2. Os drill-downs em `IndicatorsTab.tsx` e `DrillDownBarChart.tsx` normalizam esse campo via `normalizeTier()` de `src/lib/revenueTiers.ts`.
3. `TIER_NORMALIZATION` só conhece as faixas de **Faturamento mensal** de Modelo Atual/O2 TAX (`"Menos de R$ 100 mil"`, `"Entre R$ 100 mil e R$ 200 mil"`, …). Nenhum valor de Investimento casa → tudo cai em `'Não informado'`.

Resultado: dado existe, chega no componente com o valor certo, e é jogado fora na normalização.

## Fix

Editar apenas `src/lib/revenueTiers.ts` (mudança de apresentação, sem tocar em business logic):

1. Adicionar constantes paralelas para a taxonomia de Investimento (Expansão):
   - `INVESTMENT_TIER_NORMALIZATION` — mapa `raw → label curto` (ex.: `"Menos de 5 mil reais" → "< R$ 5k"`, `"Entre 5 e 15 mil reais" → "R$ 5k – 15k"`, `"Entre 15 e 30 mil reais" → "R$ 15k – 30k"`, `"Entre 30 e 50 mil reais" → "R$ 30k – 50k"`, `"Entre 50 e 100 mil reais" → "R$ 50k – 100k"`, `"Mais de 100 mil reais" → "> R$ 100k"`).
   - `INVESTMENT_TIER_ORDER` — ordenação crescente.
   - `INVESTMENT_TIER_COLORS` — cores por faixa (usando tokens `hsl(var(--chart-*))`, sem hardcode).
2. `normalizeTier()`: tentar primeiro `TIER_NORMALIZATION` (faturamento); se não casar, tentar `INVESTMENT_TIER_NORMALIZATION`; só então cair em `'Não informado'`. Comparação case-insensitive/trim já existente é preservada.
3. Antes de escrever o mapa final, rodar uma query rápida no Pipefy externo listando os valores distintos reais de `"Investimento disponível"` em `pipefy_cards_movements_expansao` (últimos 12 meses) — para garantir que as strings do enum estão exatas (acentos, "reais" vs "mil", etc.). O mapa acima é o esperado, mas será ajustado ao que o DB retornar.

## Escopo do que **não** muda

- `useExpansaoAnalytics.ts`: intocado (já entrega o dado correto).
- `IndicatorsTab.tsx` e `DrillDownBarChart.tsx`: intocados; continuam consumindo `normalizeTier` e `TIER_ORDER`. Como a normalização passa a devolver rótulos válidos, os agrupamentos deixam de colapsar em "Não informado".
- Modelo Atual e O2 TAX: comportamento inalterado (o primeiro try continua sendo o mapa de faturamento).
- Nenhum campo/coluna do Pipefy, meta ou métrica é alterado.

## Reversibilidade

Reverter é apagar as 3 constantes novas e o segundo try dentro de `normalizeTier`. Zero migração, zero mudança de dado.

## Validação

Após aplicar:
1. Abrir Dashboard → Comercial → filtrar Franquia (mês inteiro Jul/2026) → clicar em um acelerômetro (Leads/MQL/RM/RR) → o drill-down "Por Faixa de Faturamento" deve mostrar as barras com rótulos de investimento (`< R$ 5k`, `R$ 5k – 15k`, …) e não mais tudo em "Não informado".
2. Repetir para Oxy Hacker.
3. Repetir para Modelo Atual e confirmar que continua exibindo as faixas de faturamento originais (regressão).
