## Objetivo

Os "quentes" do Pace Comercial devem usar a **mesma lógica** dos quentes da seção Temperatura (fora do pace), que é o `aggregateByTemperatura` (chip 🔥 Quente no `TemperaturaSection`).

Hoje `hotOpportunityItems` em `IndicatorsTab.tsx` (L3341-3400) tem lógica própria: só Modelo Atual, filtro manual de fase terminal + motivoPerda, aplica filtros de closer/SDR/origem. Isso diverge do chip Quente que:

- Usa **todos os `allOpenCards`** das BUs selecionadas (Modelo Atual + Outbound + Franquia + Oxy Hacker + Monetização Upsell/Cross-sell/Troca de produto).
- Ignora período (`includeAllOpenIgnoringPeriod: true`).
- Exclui via `isWonPhase` + `anyRowIsLost` (fase, histórico, flag `perdido`, motivoPerda).
- Não filtra por closer/SDR/origem no aggregator.

## Correção

Substituir todo o bloco `hotOpportunityItems` do `IndicatorsTab.tsx` por:

```ts
const hotOpportunityItems = useMemo(() => {
  const { buckets } = aggregateByTemperatura({
    modeloAtualAnalytics: modeloAtualAnalyticsRaw,
    franquiaAnalytics,
    oxyHackerAnalytics,
    outboundAnalytics,
    monetizacaoAnalytics,
    selectedBUs,
    startDate,
    endDate,
    includeAllOpenIgnoringPeriod: true,
  });
  return buckets.Quente.map(item => ({
    ...item,
    value: (item.mrr || 0) + (item.setup || 0) + (item.pontual || 0) || item.value || 0,
  }));
}, [modeloAtualAnalyticsRaw, franquiaAnalytics, oxyHackerAnalytics, outboundAnalytics, monetizacaoAnalytics, selectedBUs, startDate, endDate]);
```

- Import de `aggregateByTemperatura` (já disponível em `./indicators/temperaturaAggregator`).
- Remove a resolução manual de "closer efetivo por histórico" — o aggregator já usa `toDetailItem` de cada BU, que resolve `closer`/`responsible` corretamente para os quentes vindos.
- No `CommercialPaceDashboard`, `personName` já cai para `item.closer || item.responsible`, então continua atribuindo à Dani (e a qualquer outro closer) quando o campo estiver preenchido no item.

## Efeito

- Quentes do Pace passam a bater 1:1 com o chip 🔥 Quente da Temperatura (mesma contagem, mesmo conjunto de cards) para as BUs selecionadas.
- Cards de Franquia, Oxy Hacker, Outbound e Monetização também aparecem no card "Oportunidades quentes" do Pace, respeitando `selectedBUs`.
- O drill-down (clique) mostra a mesma lista da Temperatura.

## Arquivos

- `src/components/planning/IndicatorsTab.tsx` (bloco `hotOpportunityItems`, L3341-3400)
