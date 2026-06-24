## Diagnóstico (confirmado via logs + banco)

No banco existem **10 cards de Franquia com fase `Contrato assinado` em 2026**, somando exatamente `R$ 1,353M` (Pontual gauge mostra "R$ 1.4M" arredondado ✓).

Logs do console confirmam que `useExpansaoMetas.getValueForPeriod('venda') = 1.353.000` — esta é a fonte do gauge de Pontual.

Já o gauge **"Vendas" (qty)** lê de uma fonte diferente: `franquiaAnalytics.getDetailItemsForIndicator('venda').length` (IndicatorsTab.tsx linha 1168), que usa `useExpansaoAnalytics`. Esse hook depende de `query_period` + `query_period_by_signature` + `query_card_history` no edge function — e está retornando 0 cards de venda no período, mesmo com os 10 registros existentes (não há nenhum log `[Franquia Analytics]` no console, indicando que o memo nem fechou com dados de venda).

Resultado: **fontes inconsistentes** — monetário lê tudo, contagem lê do hook com bug.

## Mudanças

### `src/components/planning/IndicatorsTab.tsx`

No bloco `if (includesFranquia)` (linhas ~1145–1171), no caminho "sem filtros de closer/SDR/origem" (linha 1168):

- Trocar `franquiaAnalytics.getDetailItemsForIndicator(indicator.key).length` por `getExpansaoQty(indicator.key as ExpansaoIndicator, startDate, endDate)`.

`getExpansaoQty` já está importado/desestruturado na linha 535 e usa exatamente a mesma fonte (`useExpansaoMetas`) que alimenta o gauge monetário. Resultado: Vendas = 10, Pontual = R$1.35M coerentes.

No caminho "com filtros de pessoa" (linha 1159), continuar usando `franquiaAnalytics.getDetailItemsForIndicator(...)` filtrado por closer/SDR — o filtro precisa da granularidade por card.

Aplicar a mesma troca para o bloco análogo de **Oxy Hacker** (linhas ~1117–1143, sem filtro → trocar `oxyHackerAnalytics.getDetailItemsForIndicator(indicator.key).length` pelo `getOxyHackerQty('venda'/'proposta'/etc, startDate, endDate)`), pois o mesmo padrão arquitetural está em uso lá e o bug é o mesmo (hoje passa despercebido porque Oxy Hacker tem volume menor).

### Não mexer

- A série do gráfico (`buildChartData` linhas 1250–1268) continua usando `franquiaAnalytics.getCardsForIndicator(...)` quando há filtros de pessoa, e `expansaoData.qty` (que vem de `useExpansaoMetas`) caso contrário — já está alinhado.
- Não mexer em `useExpansaoAnalytics` ou no edge function — o bug raiz dele exige investigação maior e fica fora desse fix.

## Validação

Após o ajuste, ao filtrar **Franquia + todo período**:
- "Vendas" deve mostrar **10** (meta 18 → ~56%).
- "Pontual" continua R$ 1.4M (93%).
- "Fat Incremento" continua R$ 1.4M.
- Os números batem com a query SQL feita no banco.

Conferir também console: o log `[useExpansaoMetas] getQtyForPeriod venda: 10 unique cards` deve aparecer.