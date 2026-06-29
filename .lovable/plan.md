## Problema
Cards do funil de Monetização (Cross-sell/Upsell/Troca) hoje são tratados como transversais — entram em Propostas/Vendas independentemente do filtro de BU. Resultado: ao filtrar só **Franquia**, os 3 Cross-sell da Mariana continuam aparecendo no drill-down de Propostas.

## Mudança
Arquivo único: `src/components/planning/IndicatorsTab.tsx`

Tornar a inclusão da Monetização condicional ao filtro de BU: só incluir quando **nenhuma BU específica está filtrada** (`isConsolidado`, ou seja, todas as 4 BUs selecionadas). Quando o usuário restringe a uma ou mais BUs específicas, a Monetização sai completamente do cálculo.

Pontos de alteração (3):
1. `calculateTotalForIndicator` (linhas ~1178-1183): adicionar `isConsolidado &&` na condição que inclui Monetização.
2. `getItemsForIndicator` (linhas ~1610-1615): mesma guarda `isConsolidado &&`.
3. Soma transversal monetária (linhas ~2455-2466): `includeMonetizacao` passa a exigir `isConsolidado` além do filtro de origem.

## Fora de escopo
- O acelerômetro/Cenário de Caixa/Temperatura usando `monetizacaoAnalytics` já recebem `selectedBUs` no aggregator quando aplicável; não alterar.
- Seção `MonetizacaoSection` (visualização própria do funil) continua mostrando tudo — é o painel dedicado.
