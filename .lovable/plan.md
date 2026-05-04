## Objetivo

Na tabela **Consolidado Anual** (aba Investimento de Mídia), substituir o formato compacto (R$ 1.7M, R$ 80k) pelo valor completo formatado em reais com separador de milhar, para permitir distinguir, por exemplo, R$ 1.701.234 de R$ 1.799.876.

## Escopo

Apenas a tabela Consolidado Anual em `src/components/planning/MediaInvestmentTab.tsx` (linhas ~2628–2698). Demais cards e gráficos da página continuam com `formatCompact` (mantém legibilidade).

## Mudanças

1. Substituir `formatCompact(...)` por uma formatação completa em todas as células de valor da tabela:
   - Linhas mensais: Modelo Atual, O2 TAX, Oxy Hacker, Franquia, Meta Total, DRE Total
   - Linha Total (rodapé): mesmas colunas
2. Usar `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })` → resultado: `R$ 1.701.234`.
3. Manter `text-xs font-mono` e `text-right` para o alinhamento ficar limpo. Se necessário, reduzir levemente padding horizontal das células (`px-2`) para caber sem quebrar — a tabela já tem `overflow-x-auto`.
4. Coluna **Ating. %** permanece igual (já é percentual).

## Detalhe técnico

```ts
const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v || 0);
```

Aplicado nas 7 colunas monetárias × 13 linhas (12 meses + Total).

## Fora do escopo

- Outros componentes/abas que usam `formatCompact`.
- Gráfico "Meta vs DRE por Mês" abaixo da tabela (eixo Y continua compacto para não poluir).
