## Diagnóstico

Os gauges (qtd/valor) já leem de `useExpansaoMetas` / `useOxyHackerMetas` (correto). Mas a planilha lateral de drill-down ainda chama `franquiaAnalytics.getDetailItemsForIndicator(...)` / `oxyHackerAnalytics.getDetailItemsForIndicator(...)` em `getItemsForIndicator` (IndicatorsTab.tsx linhas ~1540 e ~1563). Esses hooks (`useExpansaoAnalytics`) estão retornando 0 cards no período → a sheet abre vazia.

## Mudanças

### `src/components/planning/IndicatorsTab.tsx`

1. Adicionar helper `buildExpansaoMetasDetailItems(movements, indicator, startDate, endDate, produto)` que percorre `movements` aplicando a mesma regra de `getQtyForPeriod` (dedup por `id`, fase = 'Contrato assinado' OR `shouldForceAssinaturaDate` para venda; PHASE_TO_INDICATOR para os demais; MQL com filtro `isFranquiaMqlQualified`/`isOxyHackerMqlQualified`). Para cada card único emite um `DetailItem` com:
   - `id`, `name = titulo`, `phase`, `date = dataEntrada.toISOString()`
   - `product = 'Franquia' | 'Oxy Hacker'`
   - `mrr = valorMRR`, `setup = valorSetup`
   - `pontual = taxaFranquia > 0 ? taxaFranquia : (valorPontual > 0 ? valorPontual : ticketPadrao)` (ticket padrão: 140k Franquia, 54k Oxy Hacker)
   - `value = pontual` (compatível com o cálculo de drill-down)
   - `bu = 'Franquia'` ou `'Oxy Hacker'`
   - Deixar `closer/sdr/responsible` indefinidos (movements não trazem)

2. Expor `movements` de `useExpansaoMetas` e `useOxyHackerMetas` no destructure (já estão sendo retornados, falta importar).

3. Em `getItemsForIndicator`, nos blocos Franquia (linha ~1540) e Oxy Hacker (linha ~1563), quando NÃO há filtro de closer/SDR/origem ativo, usar os DetailItems vindos do helper acima. Quando há filtro ativo, manter o fallback atual (`franquiaAnalytics.getDetailItemsForIndicator` / `oxyHackerAnalytics.getDetailItemsForIndicator`) — não é regressão pois é o comportamento existente.

4. Atualizar deps do `itemsByIndicator` useMemo para incluir as referências de `franquiaMetasMovements` e `oxyHackerMetasMovements`.

5. Não alterar `getItemsWithFullHistory` (modo cohort) por enquanto — mesmo problema existe lá mas é menos crítico; podemos atacar se aparecer.

### Validação

Abrir Comercial → Franquia + período total → clicar nos cards de "Vendas" e "Pontual": a sheet deve listar 10 contratos (Mônica, Ricardo, Silvio, Erenildo, Nathan, Eduardo, Rafael, Everton, Renan, Silvio Filho) com valores Pontual somando ~R$ 1,35M. Sem regressão em Modelo Atual / O2 TAX.