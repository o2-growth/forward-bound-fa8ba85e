## Adicionar Ciclo Médio e Produto Contratado no drill-down de Vendas

Quando o usuário clica no acelerômetro de **Vendas** (caso `'venda'` em `IndicatorsTab.tsx`), o painel "Análise Visual" mostra hoje 5 KPIs (Contratos, Setup, MRR, Pontual, TCV) + 4 gráficos. A tabela por linha já tem colunas Produto e Ciclo, mas faltam duas visões agregadas.

### Mudanças

**Arquivo:** `src/components/planning/IndicatorsTab.tsx` (bloco `case 'venda'`, ~linhas 1932-2100)

1. **Novo KPI: Ciclo Médio**
   - Calcular `cicloMedio = média de cicloVenda` considerando apenas contratos com `cicloVenda > 0` (evita contratos sem `duration` distorcerem).
   - Adicionar como 6º card na linha de KPIs:
     - Ícone: ⏱️
     - Valor: `{X}d` (arredondado)
     - Label: `Ciclo Médio`
     - Highlight: `neutral`

2. **Novo gráfico: Produto Contratado**
   - Agrupar `itemsWithTCV` por `item.product` (CaaS, O2 TAX, Oxy Hacker, Franquia, ou "Não informado").
   - Para cada produto, calcular:
     - Quantidade de contratos
     - TCV total
   - Adicionar como **primeiro gráfico** (antes de "Composição do Faturamento") um `pie`:
     - Título: `Produto Contratado (TCV)`
     - Data: `[{ label: 'CaaS', value: tcvCaaS }, ...]` filtrando valores > 0
     - formatValue: `formatCompactCurrency`
   - O título da seção mostra TCV; a contagem por produto já fica clara pela proporção da pizza + tooltip.

### Observações
- Mudança puramente de apresentação no drill-down — não afeta hooks, dados ou cálculos de outros widgets.
- `cicloVenda` já é calculado em `itemsWithTCV` (linha 1949) a partir de `item.duration`.
- `item.product` já é populado pelos analytics hooks e renderizado na coluna existente.
- Sem alterações em tipos, hooks ou banco.
