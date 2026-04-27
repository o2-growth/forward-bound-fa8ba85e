## Redesenhar "Por SDR — semana a semana" como matriz comparativa

A tabela atual lista uma sub-tabela por semana, sem mostrar variações. Vou substituir por uma **matriz** (linhas = SDRs, colunas = semanas) com a mesma "pegada" do comparativo principal: número grande + % de variação vs. semana anterior, com setas TrendingUp/Down/Minus.

### Mudanças em `src/components/planning/indicators/WeeklyComparison.tsx`

**Substituir o componente `SdrBreakdownWeekly`:**

1. **Seletor de indicador** no header (RM / RR / Prop / Venda) — pills coloridos com a cor do indicador ativo. Mostra um indicador por vez para manter a matriz legível.

2. **Matriz tabular**:
   - Coluna fixa esquerda: nome do SDR (com bullet colorido do indicador ativo) — `sticky left-0`.
   - Uma coluna por semana com cabeçalho `S1` + faixa de datas `dd/MM–dd/MM`.
   - Cada célula: número grande tabular + linha de % de variação vs. semana anterior usando o mesmo `formatPctChange` e ícones `TrendingUp/Down/Minus` já usados nos cards semanais.
   - Coluna final "Total" com a soma do SDR no período.
   - Linha "Total" no rodapé com soma por semana e % de variação semana a semana.

3. **Ordenação**: SDRs ordenados pelo total do indicador ativo (desc).

4. **Estado vazio**: se não houver dados, mostrar "Sem dados de SDR no período selecionado." centralizado.

5. **Responsivo**: `overflow-x-auto` no wrapper; coluna SDR com `min-w-[140px]` e sticky para scroll horizontal limpo.

6. **Tokens**: usar `bg-muted`, `bg-background`, `text-muted-foreground`, `border` (semantic tokens). Cores de indicadores reaproveitadas do mapa `INDICATOR_COLORS` existente.

Nada mais muda — a tabela "Por SDR — período completo" e o gráfico permanecem.
