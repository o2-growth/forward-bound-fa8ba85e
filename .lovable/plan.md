## Diagnóstico

O drill-down "MQL - De Onde Vêm Nossos Melhores Leads?" mostra "Faixa Faturamento: -" e barra única "Não informado" para MQLs de Franquia e Oxy Hacker.

**Causa raiz (diferente da última correção):**
- Quando NÃO há filtro de Closer/SDR/Origem (caso padrão do dashboard), o `getItemsForIndicator` em `IndicatorsTab.tsx` (linhas 1722-1725 para Franquia e 1752-1753 para Oxy Hacker) usa `useExpansaoMetas.getDetailItemsForIndicator` / `useOxyHackerMetas.getDetailItemsForIndicator` — NÃO o `useExpansaoAnalytics` (que já popula `revenueRange`).
- Esses dois hooks de "metas" montam o item sem o campo `revenueRange`, então chega `undefined` no drill-down → coluna mostra "-" e o gráfico agrupa tudo em "Não informado".
- Confirmado via query direta: card "Maria Missileide" tem `"Investimento disponível": "Menos de 5 mil reais"` no Pipefy — o dado existe, só não é propagado.
- Os hooks já têm o `cardInvestimento` Map disponível (usam ele na qualificação do MQL — linhas 426 / 424). Só falta anexar ao item de saída.

## Correção proposta

Duas linhas, escopo mínimo, reversível:

**1. `src/hooks/useExpansaoMetas.ts`** (dentro do objeto retornado em `byCard.set(...)`, ~linha 459)
- Adicionar `revenueRange: cardInvestimento.get(movement.id) || undefined,`

**2. `src/hooks/useOxyHackerMetas.ts`** (mesma coisa, ~linha 457)
- Adicionar `revenueRange: cardInvestimento.get(movement.id) || undefined,`

## Impacto / segurança

- **Nenhuma métrica muda**: MQL count, valores monetários, dedup, meta — todos calculados por `getQtyForPeriod` / `getValueForPeriod`, intocados.
- **Só enriquece um campo** consumido apenas pelo drill-down (coluna "Faixa Faturamento" e gráfico "Por Faixa de Faturamento").
- Modelo Atual e O2 TAX continuam funcionando pelo caminho atual (analytics hook próprio).
- Fácil reverter: remover as 2 linhas.

## O que NÃO vou mexer

- `useExpansaoAnalytics.ts`, `useOxyHackerAnalytics.ts`, `useModeloAtualAnalytics.ts`, `useO2TaxAnalytics.ts`
- `src/lib/revenueTiers.ts` (já corrigido antes)
- `IndicatorsTab.tsx`, `DrillDownBarChart.tsx`
- Nenhuma migração, nenhum edge function, nenhum dado
