# Bug: MRR/Setup aparecem em Oxy Hacker (e Franquia) ao filtrar por closer/SDR

## Causa raiz

`src/hooks/useConsolidatedMetas.ts` → função `getMetaMonetaryForPeriod` (linhas 247–274).

Fluxo sem filtro (correto):
- Chama `getMetaForPeriod` → `getConsolidatedMeta` → `getPlanGrowthMeta`, que respeita `PONTUAL_ONLY_BUS = ['oxy_hacker', 'franquia']` e retorna **MRR=0, Setup=0, Pontual=100%** para essas BUs.

Fluxo com filtro de closer/SDR ativo (bug — linhas 262–270):
```ts
const filteredFaturamento = getFilteredFaturamentoMeta(...); // soma de todas BUs
switch (indicatorKey) {
  case 'mrr':     return Math.round(filteredFaturamento * 0.25);
  case 'setup':   return Math.round(filteredFaturamento * 0.60);
  case 'pontual': return Math.round(filteredFaturamento * 0.15);
}
```
Isso aplica o split 25/60/15 **uniformemente** sobre o faturamento total rateado, **ignorando** que `oxy_hacker`/`franquia` deveriam contribuir com 100% em Pontual e 0% em MRR/Setup. Resultado: ao selecionar Bruna + Oxy Hacker, aparece MRR e Setup que não existem nessa BU.

Observação: o lado realizado (`IndicatorsTab.tsx` linhas 2469–2503) já está correto — só soma `modelo_atual` e `o2_tax` para MRR/Setup. O problema é só na meta.

## Correção

Em `getMetaMonetaryForPeriod`, no ramo `closerActive || sdrActive`, calcular a meta **por BU**, aplicando o split correto conforme a BU seja pontual-only ou não, e somar — usando a mesma lógica de rateio (closer% × SDR ratio × pro-rata por dias) que `getFilteredFaturamentoMeta` já implementa.

Plano de implementação:
1. Extrair de `getFilteredFaturamentoMeta` uma versão que retorne **faturamento rateado por BU** (`Map<BuType, number>`), reaproveitando a iteração mensal, rateio de closer (`getFilteredMeta`), SDR (`sdrRatio`) e fração de dias.
2. No `getMetaMonetaryForPeriod`, quando `closerActive || sdrActive`:
   - Obter o faturamento rateado por BU.
   - Para cada BU:
     - Se `PONTUAL_ONLY_BUS.includes(bu)` → `pontual = faturamento`, `mrr = 0`, `setup = 0`.
     - Caso contrário → `mrr = fat × 0.25`, `setup = fat × 0.60`, `pontual = fat × 0.15`.
   - Somar conforme `indicatorKey` e retornar arredondado.
3. Manter `getFilteredFaturamentoMeta` retornando o total (continua usado para `faturamento`), implementado em cima do helper por-BU para não duplicar lógica.

## Validação

- Filtro: Bruna + apenas Oxy Hacker → cards MRR e Setup devem zerar (meta e realizado), Pontual deve refletir % da Bruna em `closer_metas` × faturamento de Oxy Hacker.
- Filtro: Bruna + Modelo Atual + Oxy Hacker → MRR/Setup respondem só à parcela do Modelo Atual; Pontual soma parcela de Modelo Atual (15%) + 100% de Oxy Hacker.
- Sem filtro de closer/SDR (regressão): comportamento idêntico ao atual (já passa pelo `getMetaForPeriod`, que respeita pontual-only).

## Arquivos afetados

- `src/hooks/useConsolidatedMetas.ts` — única alteração necessária.
