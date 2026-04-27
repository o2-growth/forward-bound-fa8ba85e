## Mover "Contratos por Faixa de Faturamento" para dentro do Acelerômetro de Vendas

### O que é cada coisa
- **Acelerômetro de vendas** = card "Faturamento" (`RevenuePaceChart`) — gauge/área acumulada que compara realizado vs meta de faturamento ao longo do período. Vive em `src/components/planning/indicators/RevenuePaceChart.tsx` e é renderizado em `IndicatorsTab.tsx` linha ~2970.
- **Contratos por Faixa de Faturamento** = card autônomo logo acima do acelerômetro (`IndicatorsTab.tsx` linhas 2658–2750). Mostra grid de tiers (`< R$ 100k`, `R$ 100k–200k`, …) com nº de contratos, valor total e %.

### Mudanças

1. **`RevenuePaceChart.tsx`**
   - Adicionar props opcionais: `tierBreakdown`, `totalContratos`, `totalContratosValor`.
   - Dentro do `CollapsibleContent`, abaixo do gráfico, renderizar o grid de tiers (mesma UI dos cards: bolinha colorida, contagem, valor, % e barra de progresso). Título da seção: "Contratos por Faixa de Faturamento" com o total ao lado.
   - Não renderizar a seção se `tierBreakdown` vier vazio.

2. **`IndicatorsTab.tsx`**
   - Remover o card autônomo (linhas 2658–2750).
   - Calcular `tierData`, `totalContratos`, `totalValor` no escopo do `RevenuePaceChart` (junto à preparação do `paceChartData`) e passar como props.
   - Manter exatamente a mesma lógica de mapeamento de tiers (`TIER_NORM`, `TIER_COLORS`, `TIER_ORDER_LIST`) já existente, agora dentro da preparação dos dados do acelerômetro.

### Resultado
Card "Faturamento" passa a ter duas seções dentro do mesmo Collapsible:
- Em cima: gráfico de pace (acumulado)
- Embaixo: grid de Contratos por Faixa de Faturamento
A seção autônoma some, eliminando duplicação visual.

Sem mudanças em hooks, banco ou edge functions.