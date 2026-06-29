## Objetivo

Bater os números das 4 seções da aba **Indicadores · Marketing** — **Performance por Canal**, **Performance de Campanhas / Criativos**, **Funil Comparativo por Fonte** e **Resultados Gerais** — usando uma **única fonte de verdade** (Pipefy `allAttributionCards`) e a **mesma regra de dedup/atribuição do Indicador Comercial**.

## Problema atual

Hoje cada seção calcula funil/receita por conta própria:

- `PerformanceByChannelSection` → agrega por canal usando `channelSummaries` (vindo de `useMarketingAttribution`, que conta cards 1× e aplica funil cumulativo) + investimento/impressões/cliques das APIs Meta+Google.
- `CreativeAdPerformanceSection` → usa `adCreativeFunnels`/`adSetFunnels` (mesma origem, mas com chave campanha::conjunto::anúncio).
- `SourceFunnelSection` → tem seu **próprio** `PHASE_FUNNEL_MAP` local; faz dedup com Set; sobrescreve `vendas` com `salesCards` separado (Contrato/Ganho).
- `OverallResultsSection` → consolida totais por outra via, mistura realRevenue dos hooks de meta com somatórios próprios.

Resultado: leads/MQL/RR/Propostas/Vendas/Receita não fecham entre as seções, nem com o Indicador Comercial.

## Princípios de reconciliação (regra do Comercial)

1. Fonte única: `allAttributionCards` montado em `MarketingIndicatorsTab` (Modelo Atual + O2 TAX + Franquia + Oxy Hacker + Outbound + Monetização — incluir Monetização se a seção considerar).
2. Exclusão de test cards via `isTestCard` (já aplicado na montagem).
3. Funil: `PHASE_FUNNEL_MAP` + cumulativo (`FUNNEL_ORDER`) — copiar do `useMarketingAttribution` para o módulo compartilhado.
4. Dedup mensal por `card.id` + fase (1 conta por fase no período).
5. Venda extra-dedup por `card.id`+mês preferindo `Ganho` sobre `Contrato assinado`, ignorando `Contrato em elaboração` (regra Sales Phase Universal Definition).
6. Data da venda usa `dataAssinatura ?? dataMovimento` (Sales Date Prioritization).
7. Receita: `MRR + Setup + Pontual` (sem Educação) para os totais padrão; TCV = `MRR*12 + Setup + Pontual`.
8. Atribuição de canal: `detectChannel(card)` do `useMarketingAttribution` — preserva eventos > Meta > Google > orgânico.
9. Período: filtrar cards pelo `dateRange.from..to` usando `dataEntrada` para etapas e `dataAssinatura` para vendas.

## Implementação

### 1) Novo módulo `src/lib/marketingFunnelAggregator.ts`

Exporta funções puras compartilhadas — sem hooks, fácil de testar e de reusar nas 4 seções:

```ts
export type FunnelStage = 'leads'|'mqls'|'rms'|'rrs'|'propostas'|'vendas';

export const PHASE_FUNNEL_MAP: Record<string, FunnelStage>;   // mesma do useMarketingAttribution + 'Ganho' -> 'vendas'
export const FUNNEL_ORDER: FunnelStage[];

export function buildCardStages(card: AttributionCard): Set<FunnelStage>;       // cumulativo
export function isSaleCard(card: AttributionCard): boolean;                     // Ganho/Contrato assinado
export function dedupSalesByMonth(cards: AttributionCard[]): AttributionCard[]; // 1× por card+mês, prefere Ganho
export function aggregateFunnel(cards: AttributionCard[], range): FunnelCounts; // {leads,mqls,rms,rrs,propostas,vendas, mrr,setup,pontual, tcv}
export function aggregateBy<K>(cards, keyFn, range): Map<K, FunnelCounts>;      // canal/origem/campanha/criativo
```

A regra de dedup e cumulatividade vive **só aqui**. O `useMarketingAttribution` passa a **importar** dessas funções (zero divergência) e mantém o agrupamento por campanha/adset/criativo.

### 2) Refactor das 4 seções

| Seção | Antes | Depois |
|-------|-------|--------|
| **PerformanceByChannelSection** | `channelSummaries` próprios | `aggregateBy(detectChannel)` do aggregator + investimento das APIs |
| **CreativeAdPerformanceSection** | `adCreativeFunnels`/`adSetFunnels` | mesma origem, mas `useMarketingAttribution` agora usa o aggregator → mesmos números |
| **SourceFunnelSection** | `PHASE_FUNNEL_MAP` local + `salesCards` separado | `aggregateBy(getLeadSource)` do aggregator, sem mapa duplicado |
| **OverallResultsSection** | mix de hooks | totais vindos de `aggregateFunnel(allAttributionCards, range)` + receita do mesmo aggregator |

`realRevenue` em `OverallResultsSection` passa a sair do aggregator (MRR/Setup/Pontual dos cards vendidos), batendo com Indicador Comercial em vez de somar hooks distintos.

### 3) Auditoria visual

Adicionar um painel de debug colapsável `MarketingReconciliationDebug` (só dev) listando, por seção, `leads/mqls/rms/rrs/propostas/vendas/receita` lado a lado para confirmar que os 4 cards mostram a mesma coisa quando os filtros estão iguais. Removível depois de validado.

### 4) Verificação ponta a ponta

- Selecionar Jun/2026, sem filtro de canal: comparar Total da Performance por Canal com Total do Resultados Gerais e com Indicador Comercial (`IndicatorsTab`) — devem bater em todos os 6 estágios e em MRR/Setup/Pontual/TCV.
- Filtrar canal = Meta Ads: Performance por Canal (linha Meta) ≡ Funil Comparativo por Fonte (linhas com canal Meta) ≡ soma de Criativos Meta.
- Subset Monetização: confirmar que está incluído no Funil Comparativo por Fonte mas excluído do Performance por Canal se hoje está fora (decisão a confirmar — ver pergunta abaixo).

## Fora do escopo

- Mudanças visuais nas 4 seções.
- Mudanças nos hooks de Meta/Google APIs (investimento/impressões/cliques continuam vindo deles).
- Cohort, Conversion Curve, Online/Offline, Indicators 26 — não foram mencionados.

## Detalhes técnicos

- Arquivos novos: `src/lib/marketingFunnelAggregator.ts`.
- Arquivos editados: `src/hooks/useMarketingAttribution.ts` (passa a importar do aggregator), `PerformanceByChannelSection.tsx`, `CreativeAdPerformanceSection.tsx`, `SourceFunnelSection.tsx`, `OverallResultsSection.tsx`.
- Sem migration, sem nova edge function, sem mudança de schema.
- Build/typecheck rodam automaticamente.

## Pergunta de escopo antes de implementar

**Monetização** entra no Marketing? Hoje `allAttributionCards` no `MarketingIndicatorsTab` **não** inclui cards do funil de Monetização (só MA + O2 TAX + Franquia + Oxy + Outbound). No Indicador Comercial Monetização entra como origem própria. Confirmar se quer incluir Monetização aqui para 100% de match com o Comercial — vou assumir **sim** (mais consistente) salvo orientação contrária.
