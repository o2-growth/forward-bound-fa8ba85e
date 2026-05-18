## Objetivo

1. Adicionar gráfico **"Reuniões por Tier de Faturamento"** dentro do acelerômetro/mini-dashboard de **Reunião Marcada (RM)**, ao lado dos charts existentes.
2. Garantir que a faixa **"> R$ 5M"** apareça em todos os charts de tier nos acelerômetros.

## Diagnóstico do tier >R$ 5M

Em `src/lib/revenueTiers.ts`, tanto `TIER_NORMALIZATION` (`'Acima de R$ 5 milhões' → '> R$ 5M'`) quanto `TIER_ORDER` (último item) e `TIER_COLORS` já contemplam essa faixa. **Nada a corrigir aqui** — a faixa aparece automaticamente sempre que houver pelo menos 1 card com esse valor (os charts filtram `value > 0` para evitar barras vazias). Vou apenas validar visualmente na entrega.

## Onde alterar

### A) `src/components/planning/IndicatorsTab.tsx` — case `'rm'` (~linhas 1662-1736)

Hoje os charts de RM são:
- Ranking por SDR
- Tempo como MQL (distribution)

Adicionar um terceiro:
```ts
// 3. Reuniões por Tier de Faturamento
const tierCounts = new Map<string, number>();
items.forEach(i => {
  const tier = normalizeTier(i.revenueRange);
  tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
});
const rmByTier = TIER_ORDER
  .map(label => ({ label, value: tierCounts.get(label) || 0 }))
  .filter(d => d.value > 0);
Array.from(tierCounts.entries())
  .filter(([label]) => !TIER_ORDER.includes(label))
  .forEach(([label, value]) => rmByTier.push({ label, value }));
```
Incluir em `charts`:
```ts
{ type: 'bar', title: 'Reuniões por Tier de Faturamento', data: rmByTier },
```
(Imports `TIER_ORDER` e `normalizeTier` já existem no arquivo — usados no case `proposta`.)

### B) `src/components/planning/ClickableFunnelChart.tsx`

Hoje `handleStageClick` só chama mini-dashboard para `proposta` e `venda`; para `rm` cai no fluxo "items + columns" sem KPIs/charts. Criar `buildReuniaoMiniDashboard()` espelhando o padrão de `buildPropostaMiniDashboard`:

- **Items:** `getItemsForIndicator('rm')`
- **KPIs:** Reuniões (total), Top SDR, Tempo médio como MQL (se `duration` disponível), Taxa MQL→RM se possível
- **Charts:**
  - `Ranking por SDR` (bar)
  - `Tempo como MQL` (distribution: 1-7 / 8-14 / 15-30 / 30+ dias) — só se `duration` existir nos items
  - `Reuniões por Tier de Faturamento` (bar usando `normalizeTier` + `TIER_ORDER`)
- **Columns:** Produto, Empresa, SDR, Faixa Faturamento, Data

Wire em `handleStageClick`:
```ts
if (stage.indicator === 'rm') { buildReuniaoMiniDashboard(); return; }
```

## Fora do escopo

- Não mexer em `rr` (Reunião Realizada) — já tem chart "Por Faixa Faturamento" próprio (não normalizado, mas usuário não pediu).
- Sem mudanças em hooks, DB ou edge functions.
- Sem ajustes em `revenueTiers.ts` (>R$ 5M já contemplado).

## Arquivos a editar

- `src/components/planning/IndicatorsTab.tsx` — adiciona 3º chart no case `rm`
- `src/components/planning/ClickableFunnelChart.tsx` — cria `buildReuniaoMiniDashboard` + roteamento em `handleStageClick`

## Validação

Abrir o card "Reuniões Agendadas" em qualquer BU (Modelo Atual / O2 TAX / Oxy Hacker / Franquia) tanto pelo funil clicável quanto pela aba Indicadores. O sheet deve mostrar 3 gráficos lado a lado (Ranking SDR | Tempo como MQL | Tier de Faturamento). Soma das barras de tier deve igualar o KPI "Reuniões". Verificar que a barra "> R$ 5M" aparece quando há cards nessa faixa (testar em Modelo Atual onde há cards desse tier).
