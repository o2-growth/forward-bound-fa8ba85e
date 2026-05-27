# Alinhar Meta do gráfico Faturamento com o acelerômetro Fat Incremento

## Problema

O card **Faturamento (Acumulado)** em `RevenuePaceChart` mostra hoje uma `Meta: R$ 1,5M` calculada de forma diferente do acelerômetro **Fat Incremento**:

- **Acelerômetro Fat Incremento** (`getMetaMonetaryForIndicator`) → usa `getMetaMonetaryForPeriod('faturamento', ...)` do hook consolidado, que respeita:
  - BUs selecionadas
  - Filtros de **Closer** (rateio via `closer_metas %`)
  - Filtros de **SDR** (rateio via RM+RR meta por SDR)
  - Lock de metas por mês, etc.

- **Gráfico Faturamento Acumulado** (`IndicatorsTab.tsx` linhas ~3200 e ~3279) → soma direta de `metasPorBU[bu][monthName]` do Plan Growth, **ignorando** filtros de Closer/SDR e a lógica consolidada. Por isso o gráfico mostra meta inflada quando o usuário filtra um Closer/SDR específico, divergindo do acelerômetro.

## Solução

Substituir, em `src/components/planning/IndicatorsTab.tsx`, as duas somas locais de meta no bloco do `RevenuePaceChart` (~linhas 3157–3206 e 3236–3285) pelo mesmo helper usado pelo acelerômetro:

```ts
const metaForRange = (from: Date, to: Date) =>
  getMetaMonetaryForIndicator({
    key: 'faturamento',
    label: 'Fat Incremento',
    shortLabel: 'Fat Inc.',
    format: 'currency',
  });
```

Como `getMetaMonetaryForIndicator` é fixo no `startDate`/`endDate` globais, criar uma versão local que aceite `from`/`to` chamando diretamente `getMetaMonetaryForPeriod('faturamento', selectedBUs, from, to, closerFilter, getFilteredMeta, sdrRatio)` com o mesmo `closerFilter`/`sdrRatio` já montados no `getMetaMonetaryForIndicator`.

Refatorar para extrair `closerFilter` e `sdrRatio` em um pequeno helper `buildMetaArgs()` reutilizável (evita duplicar a montagem do `sdrRatio` baseado em `BU_SDRS`/`sdrMetasList`).

Usar esse helper para:

1. **Header / totalMeta** (substitui o loop em 3200–3206):
   ```ts
   const totalMeta = metaForRange(startDate, endDate);
   ```

2. **Cada ponto do `paceChartData`** (substitui o loop em 3279–3285):
   ```ts
   periodMeta = metaForRange(periodStart, periodEnd);
   ```
   (acumulado continua via `cumulativeMeta += periodMeta`).

Nada muda no `realizado`, no `mrrBase`, no `tierBreakdown` ou em outros gráficos — apenas a fonte da linha tracejada "Meta Acumulada".

## Resultado esperado

- A linha de **Meta Acumulada** do gráfico passa a bater exatamente com o número exibido no acelerômetro **Fat Incremento**.
- Filtros de **BU, Closer, SDR e período** se refletem no gráfico igual ao acelerômetro.
- Sem mudanças visuais no realizado nem em outros indicadores.
