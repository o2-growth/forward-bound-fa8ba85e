## Objetivo

Na aba **Indicadores**, deixar o painel **Comparativo Semanal** encolhido (fechado) por padrão e **remover** completamente o painel **Comparativo Mensal**.

## Situação atual

- O painel **Comparativo Semanal** (`WeeklyComparison`) já é um collapsible e já abre **fechado** por padrão (estado inicial `isOpen = false`). Ou seja, ele já fica encolhido — nada a alterar no comportamento.
- O painel **Comparativo Mensal** (`MonthlyComparison`) é renderizado logo abaixo, em `IndicatorsTab.tsx` (linhas 2660–2665).

## O que será feito

1. **`src/components/planning/IndicatorsTab.tsx`**
   - Remover o bloco JSX do `<MonthlyComparison ... />` (linhas 2660–2665).
   - Remover o import não utilizado: `import { MonthlyComparison } from "./indicators/MonthlyComparison";` (linha 39).

2. **`src/components/planning/indicators/MonthlyComparison.tsx`**
   - Excluir o arquivo (não é mais usado em nenhum lugar).

3. **`src/components/planning/indicators/WeeklyComparison.tsx`**
   - Sem alteração — já inicia encolhido.

## Resultado esperado

- A seção "Comparativo Semanal — {mês}" continua aparecendo, fechada por padrão, e o usuário pode expandir clicando no header.
- A seção "Comparativo Mensal" some completamente da aba Indicadores.
