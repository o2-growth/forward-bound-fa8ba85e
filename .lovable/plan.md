## Objetivo

Adicionar um terceiro gráfico **"Propostas por Tier de Faturamento"** dentro do acelerômetro/mini-dashboard de Propostas, ao lado de "Pipeline por Closer" e "Aging das Propostas".

## Onde

O mini-dashboard de Propostas é montado em dois lugares (mesma estrutura, mesmo array de `charts: ChartConfig[]`):

1. `src/components/planning/ClickableFunnelChart.tsx` — linhas ~301-350 (`buildPropostaMiniDashboard`)
2. `src/components/planning/IndicatorsTab.tsx` — linhas ~1830-1860 (bloco proposta)

Os dois precisam receber o mesmo novo chart para manter consistência.

## Implementação

### 1. Helper de normalização de tier

Reutilizar o mapa `TIER_NORMALIZATION` / `TIER_ORDER` de `FunnelConversionByTierWidget.tsx`. Extrair para um helper compartilhado em `src/lib/revenueTiers.ts`:

```ts
export const TIER_NORMALIZATION: Record<string, string> = { ... }; // copiar do widget
export const TIER_ORDER = [ ... ];
export function normalizeTier(range?: string): string { ... }
```

Atualizar `FunnelConversionByTierWidget.tsx` para importar deste helper (sem mudar comportamento).

### 2. Novo chart em ambos os builders

Logo após o cálculo de `agingDistribution`, adicionar:

```ts
// Charts - Propostas por Tier de Faturamento
const tierMap = new Map<string, number>();
TIER_ORDER.forEach(t => tierMap.set(t, 0));
itemsWithAging.forEach(i => {
  const tier = normalizeTier(i.revenueRange);
  tierMap.set(tier, (tierMap.get(tier) || 0) + 1);
});
const propostasByTier = Array.from(tierMap.entries())
  .filter(([, v]) => v > 0)
  .map(([label, value]) => ({ label, value }));
```

E incluir no array `charts`:

```ts
{ type: 'bar', title: 'Propostas por Tier de Faturamento', data: propostasByTier },
```

Resultado: o mini-dashboard passa a ter 3 gráficos lado a lado (Pipeline por Closer | Aging | Tier de Faturamento).

## Fora do escopo

- Não criar widget standalone na aba Segmentação (descartado — a visão fica dentro do acelerômetro de Propostas).
- Não mexer no `FunnelConversionByTierWidget` além da extração do helper.
- Sem mudanças de DB ou hooks de analytics.

## Arquivos editados

- `src/lib/revenueTiers.ts` — novo (extrai TIER_NORMALIZATION/TIER_ORDER/normalizeTier)
- `src/components/planning/indicators/FunnelConversionByTierWidget.tsx` — passa a importar do helper
- `src/components/planning/ClickableFunnelChart.tsx` — adiciona chart de tier no mini-dashboard
- `src/components/planning/IndicatorsTab.tsx` — adiciona chart de tier no mini-dashboard

## Validação

Abrir o card "Propostas" em qualquer BU (Modelo Atual / O2 TAX / Oxy / Franquia). O sheet de detalhes deve mostrar 3 gráficos. A soma das barras do tier deve igualar o KPI "Propostas" do mesmo sheet.