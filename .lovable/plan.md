## Mudança

No arquivo `src/components/planning/MediaInvestmentTab.tsx`, gráfico empilhado abaixo da tabela Consolidado Anual (linha 2708):

1. **Título do card**: `"Meta vs DRE por Mês (Empilhado por BU)"` → `"Meta vs Realizado por Mês (Empilhado por BU)"`
2. **Label do tooltip** (linha 2741): `'DRE Total'` → `'Realizado Total'`
3. **Label da legenda** (linha 2753): `'DRE Total'` → `'Realizado Total'`

Apenas mudança de rótulos (UI). Nenhuma alteração de cálculo, fonte de dados ou lógica.

## Fora do escopo

- Card "Meta vs Realizado Contábil" em `FinancialTab.tsx` (já está com nome correto).
- Demais usos de "DRE" no app (a aba Financeiro continua mostrando DRE — ali faz sentido).
