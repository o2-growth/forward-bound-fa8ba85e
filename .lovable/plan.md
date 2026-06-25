## Objetivo
Na tabela "Visão Total — Indicadores 26" (aba Marketing), tornar cada linha clicável e abrir um modal com o gráfico mês a mês daquele indicador.

## O que muda

**1. `ConsolidatedIndicators26Section.tsx`**
- Cada `<tr>` de indicador vira clicável (cursor-pointer + hover destacado).
- Ao clicar, abre um `Dialog` com:
  - Título: nome do indicador + formato (R$, %, x…)
  - Gráfico de linha (Recharts) com 1 ponto por mês de 2026 já fechado + meses de 2025 (Jul–Dez) para contexto histórico.
  - Eixo X: rótulos curtos (Jul/25, Ago/25, …, Jan, Fev, … até mês atual).
  - Eixo Y: formatado conforme `Fmt` (brl/int/pct/x/mes).
  - Tooltip mostra o valor formatado.
  - Card resumo com: último valor, mês anterior, variação MoM (%), melhor e pior mês da série.
  - Se houver `bench` (ROAS/LTV-CAC/ROI), linha de referência tracejada.
- Colunas Q1/Q2/Q3/Q4 e TOTAL 2026 são ignoradas no gráfico (só meses puros).
- Reaproveita `rowMap`, `COLS`, `fmtValue` já existentes — sem novo fetch.

**2. Novo componente `IndicatorTrendDialog.tsx`** (mesma pasta)
- Props: `open`, `onOpenChange`, `label`, `fmt`, `bench?`, `series: { month: string; value: number | null }[]`.
- Encapsula o Dialog + LineChart + card de stats, para manter `ConsolidatedIndicators26Section` enxuto.

## Detalhes técnicos
- Filtro de pontos: apenas chaves `jul25..dez25` e `jan..dez` (excluindo `q1..q4`, `q325`, `q425`, `total2026`).
- Pontos com valor `null` viram gaps na linha (`connectNulls={false}`).
- Reutiliza `Dialog` do shadcn e `ResponsiveContainer`/`LineChart` do Recharts (já usado em `InvestmentByChannelChart`).
- Sem mudanças em hooks ou backend.

## Fora de escopo
- Não altera as outras seções da aba Marketing (gauges, funnel, etc).
- Não adiciona comparação multi-indicador no mesmo gráfico (só 1 por modal).