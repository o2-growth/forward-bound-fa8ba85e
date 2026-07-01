## Problemas identificados

### 1. Filtro de período não está sendo aplicado corretamente
Ao mudar o `dateRange` no topo da Visão CEO, várias seções ignoram o `from` (só olham `to.month`) ou usam dados anuais fixos:

- **`DreSection.tsx`** — usa `MONTHS_PT.slice(0, dateRange.to.getMonth() + 1)`, ignorando o mês de início. Se eu escolher Abril–Junho ele mostra Jan–Jun.
- **`CaixaSection.tsx`** — chama `useOxyFinance()` sem período e usa `cashflowChart` inteiro do ano. "Entradas/Saídas/Saldo" são sempre YTD, não do período filtrado.
- **`PessoalSection.tsx`** — chama `useOxyFinance()` sem período (o hook já cobre o ano; só `sumMonths` respeita `from/to`, então o número de "Receita do período" funciona, mas o `receitaPorPessoa` usa headcount atual e não do período — apenas documentar isso via tooltip).
- **`ComercialSection.tsx`** — usa `dateRange` corretamente nos analytics de Pipefy, mas os cards "Overview histórico" (Último mês / Média 3 meses / MTD / Projeção) são fixos ao mês atual e ignoram o filtro — isso é intencional; deixar claro no subtítulo que essa tabela é fixa por design.

### 2. CEO Comercial não bate com Indicadores Comercial
Hoje `ComercialSection` calcula "Realizado (faturamento)" via `sumVendaValue(...analytics)`, que soma apenas `getCardsForIndicator('venda').valor` do Pipefy para as 5 BUs. Já `IndicatorsTab.tsx` (fonte de verdade da aba Indicadores) usa:

- Modelo Atual → `getModeloAtualValue('venda', ...)` (Oxy Finance realizada, com fallback Pipefy)
- O2 TAX → `o2TaxAnalytics.getCardsForIndicator('venda')` somando `valor` (Pipefy)
- Oxy Hacker → `getOxyHackerValue('venda', ...)` (Oxy Finance)
- Franquia → `getExpansaoValue('venda', ...)` (Oxy Finance)
- Monetização → `getFilteredMonetizacaoItems('venda')` somando `.total` (só no Consolidado / origem `monetizacao`)
- Aplica filtros de Closer / SDR / Origem via `filteredVendasForBU`

Resultado: os dois lugares mostram números diferentes porque o CEO nunca puxa Oxy Finance e nunca soma Monetização.

## Correções propostas

### A. Unificar cálculo do faturamento (fonte única)
1. Extrair a lógica de `switch(indicator.key) case 'faturamento'` de `IndicatorsTab.tsx` para um helper reutilizável em `src/lib/faturamentoAggregator.ts`:
   ```ts
   computeFaturamentoRealizado({
     selectedBUs, startDate, endDate,
     modeloAtualAnalytics, o2TaxAnalytics, oxyHackerAnalytics,
     franquiaAnalytics, monetizacaoAnalytics,
     getModeloAtualValue, getOxyHackerValue, getExpansaoValue,
     filters?: { closers, sdrs, origens },
   }): number
   ```
2. `IndicatorsTab.tsx` passa a chamar o helper (comportamento idêntico).
3. `ComercialSection.tsx` (CEO) passa a chamar o mesmo helper com `selectedBUs = todas` e sem filtros de closer/sdr → o Realizado do CEO Comercial fica idêntico ao "Fat Incremento" do consolidado da aba Indicadores.
4. Remover `sumVendaValue` local de `ComercialSection.tsx`.

### B. Corrigir filtro de período nas seções CEO
1. **`DreSection.tsx`** — trocar `monthsUpTo = MONTHS_PT.slice(0, to.getMonth()+1)` por `monthsInRange = MONTHS_PT.slice(from.getMonth(), to.getMonth()+1)` e usar essa lista em toda a agregação e nas colunas da tabela. Ajustar dependências do `useMemo` para `[oxy.dreLines, dateRange.from, dateRange.to]`.
2. **`CaixaSection.tsx`** — filtrar `oxy.cashflowChart` pelos meses do período (usando `MONTHS_PT[from.getMonth()..to.getMonth()]`) antes de calcular `totalIn/totalOut/saldo/acumulado`. Ajustar tooltips ("Fluxo de caixa do período" no lugar de "do ano"). `useOxyExpenses` já recebe `dateRange`, mantém.
3. **`ComercialSection.tsx`** — adicionar subtítulo explícito na tabela "Overview histórico" indicando que a janela é fixa (independente do filtro), para tirar a impressão de bug.
4. **`PessoalSection.tsx`** — sem mudança de dado (já usa `sumMonths(..., from, to)`), apenas adicionar nota "Headcount = snapshot atual" onde já não estiver clara.

### C. Alinhar também a Meta de faturamento (bônus de consistência)
No card "Meta do período" do bloco Pace, hoje o CEO usa `consolidated.getMetaForPeriod([...ALL_BUS], startDate, endDate, 'faturamento')`. Confirmar que essa é exatamente a mesma chamada usada em `IndicatorsTab` (é). Caso positivo, sem mudança — apenas documentar no tooltip que soma inclui todas as 4 BUs.

## Arquivos afetados
- Novo: `src/lib/faturamentoAggregator.ts`
- `src/components/planning/IndicatorsTab.tsx` (usa o novo helper no case `faturamento`)
- `src/components/planning/ceo/ComercialSection.tsx` (usa o helper + subtítulo do overview)
- `src/components/planning/ceo/DreSection.tsx` (respeitar `from`)
- `src/components/planning/ceo/CaixaSection.tsx` (respeitar `from`+`to`)
- `src/components/planning/ceo/PessoalSection.tsx` (apenas copy do tooltip)

## Validação
- Selecionar "01/06 → 30/06" na Visão CEO: DRE deve mostrar só coluna Jun; Caixa deve mostrar Entradas/Saídas só de Jun.
- Comparar "Realizado" do bloco Pace (CEO Comercial) com "Fat Incremento" do consolidado em Indicadores Comercial para o mesmo período — números idênticos.
- Rodar `tsgo` para garantir tipagem do helper.