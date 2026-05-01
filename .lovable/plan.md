## Objetivo

Forçar **Valor Pontual** fixo para 2 cards de Expansão (Franquia), sobrescrevendo o que vier do Pipefy:

- **ALEXANDRE CORREA** → Valor Pontual = R$ 43.000
- **JEAN MORBIS** → Valor Pontual = R$ 36.000

Os outros valores (MRR, Setup, Taxa de franquia) destes cards passam a ser zerados, para que o cálculo de venda use apenas o Pontual forçado. Demais cards da lista (Monica, Ricardo, Elizeth) ficam intocados — continuam usando os valores do banco.

## Mudança técnica

1. **`src/hooks/dateUtils.ts`**
   - Adicionar `FORCED_PONTUAL_VALUES: Record<string, number>` com mapa título → valor:
     ```
     { 'ALEXANDRE CORREA': 43000, 'JEAN MORBIS': 36000 }
     ```
   - Adicionar helper `getForcedPontualValue(titulo: string): number | null` que normaliza o título (NFD, lowercase, trim) e retorna o valor forçado ou `null`.

2. **`src/hooks/useExpansaoMetas.ts`**
   - Após montar o objeto `movement` (linha ~119), aplicar o override:
     ```
     const forcedPontual = getForcedPontualValue(titulo);
     if (forcedPontual !== null) {
       movement.valorPontual = forcedPontual;
       movement.valorMRR = 0;
       movement.valorSetup = 0;
       movement.taxaFranquia = 0;
     }
     ```
   - Como o cálculo em `getValueForPeriod` faz `taxaFranquia > 0 ? taxaFranquia : (pontual + setup + mrr)`, com taxaFranquia=0 ele somará `0 + 0 + 43000 = R$ 43.000` corretamente.

3. **`src/hooks/useExpansaoAnalytics.ts`**
   - Mesmo override aplicado dentro de `parseRawCard`, antes de retornar o `ExpansaoCard`, garantindo que drill-downs e detalhamentos exibam o valor correto.

## Comportamento esperado

- Em Abril/2026 (já forçado pela mudança anterior), Alexandre Correa entra como venda de R$ 43.000 (Pontual) e Jean Morbis como R$ 36.000 (Pontual).
- MRR/Setup/Taxa Franquia desses 2 cards = R$ 0 (não somam em outras métricas).
- Aparecem corretamente em: card de Vendas, gráfico mensal, drill-down, GMV.
- Os outros 6 cards forçados (Monica, Ricardo, Elizeth, Ediouro, Cotrim, Fujitec) permanecem com valores do banco.
