## Diagnóstico

Filtrei o código em `src/components/planning/IndicatorsTab.tsx` e identifiquei a causa: **os cards monetários (Fat Incremento, MRR, Setup, Pontual) só consideram o filtro de Closer — o filtro de SDR é totalmente ignorado** tanto no realizado quanto na meta.

Os cards de quantidade (MQLs, Reuniões, Propostas, Vendas) já filtram por SDR — por isso "MQLs = 8" mudou ao escolher Amanda. Já os monetários:

- `getRealizedMonetaryForIndicator` (linhas 2084-2259) só checa `effectiveSelectedClosers`. Quando há só SDR selecionada, cai no `else` e soma o total da BU sem filtro nenhum.
- `getMetaMonetaryForIndicator` (2262-2274) também só passa `closerFilter` para `getMetaMonetaryForPeriod` — sem rateio por SDR.

Por isso, com Amanda Serafim selecionada em Mai/2026, os 4 cards monetários mostram o valor cheio das BUs (Modelo Atual + outras), e não a fatia atribuível à Amanda.

> Obs.: existe regra em memória "Monetary Gauges Closer Filter" (rateio via `closer_metas %`) — porém não há equivalente para SDR. Como a SDR não fecha venda, o "realizado por SDR" precisa vir dos cards de venda em que ela aparece como SDR (campo `card.sdr` já disponível em `useModeloAtualAnalytics` e `useO2TaxAnalytics`).

## Plano

### 1. Realizado — filtrar vendas por SDR
Em `getRealizedMonetaryForIndicator` (IndicatorsTab.tsx ~2084-2259), aplicar a SDR de forma análoga ao Closer, em todas as BUs e nos 4 indicadores monetários (`faturamento`, `mrr`, `setup`, `pontual`):

- Ler `effectiveSelectedSDRs` e considerar `sdrFilterActive = effectiveSelectedSDRs.length > 0`.
- Quando `sdrFilterActive` (sozinho ou combinado com closer), trabalhar **sempre via `getCardsForIndicator('venda')`** e aplicar:
  - `matchesCloserFilter(card.closer)` se houver filtro de closer; 
  - **`matchesSdrFilter(card.sdr ?? card.responsavel)`** se houver filtro de SDR.
- Somar `valor` / `valorMRR` / `valorSetup` / `valorPontual` conforme o indicador (Oxy Hacker e Franquia continuam tratando tudo como Pontual).
- Para Modelo Atual / O2 TAX só somar se a SDR selecionada operar na BU (já existe `BU_SDRS` + `sdrFilterForBU`); se nenhuma SDR selecionada operar na BU, contribui 0.

### 2. Meta — rateio por SDR
Estender `getMetaMonetaryForIndicator` para passar também `sdrFilter = effectiveSelectedSDRs` e usar `sdr_metas` como base de rateio:

- Em `useConsolidatedMetas.getMetaMonetaryForPeriod`, aceitar parâmetro opcional `sdrFilter`.
- Quando `sdrFilter` ativo (e closerFilter vazio), calcular **proporção da SDR** por BU/mês usando `useSdrMetas.getSdrMetaTotals` (somando RM+RR ou só RM como proxy de capacidade) sobre o total de RM+RR da BU/mês — esse % multiplica o `faturamento` meta da BU/mês. Mesmo padrão do rateio de Closer.
- Derivar MRR (25%), Setup (60%), Pontual (15%) sobre o faturamento rateado, igual ao caminho de Closer.
- Quando SDR e Closer estiverem ativos juntos, aplicar Closer primeiro (comportamento atual) e depois reduzir pelo % de SDR sobre o subset.

### 3. Validação
- Login na preview com `jv241004@gmail.com` via Playwright.
- Filtro: Mai/2026 + SDR "Amanda Serafim" (sem closer).
- Conferir que Fat Incremento, MRR, Setup e Pontual mudam (realizado e meta) em relação ao "Todos SDRs".
- Conferir caso combinado SDR + Closer e SDR sem operação na BU (deve zerar a contribuição daquela BU).

### Arquivos afetados
- `src/components/planning/IndicatorsTab.tsx` (funções `getRealizedMonetaryForIndicator` e `getMetaMonetaryForIndicator`).
- `src/hooks/useConsolidatedMetas.ts` (assinatura e lógica de `getMetaMonetaryForPeriod`).
- Sem mudanças de schema/DB.

### Observação sobre memória
Após implementar, atualizar a memória "Monetary Gauges Closer Filter" para "Monetary Gauges Closer/SDR Filter", documentando que SDR também rateia realizado (via campo `card.sdr`) e meta (via `sdr_metas`).