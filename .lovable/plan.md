## Problema

Os acelerômetros monetários (Faturamento, MRR, Setup, Pontual) **não respeitam o filtro de Closer** corretamente. Hoje o filtro só atua em Modelo Atual; em O2 TAX, Oxy Hacker e Franquia tanto o realizado quanto a meta são exibidos cheios, ignorando o filtro.

## Causas raiz (em `IndicatorsTab.tsx` + `useConsolidatedMetas.ts`)

1. **Realizado de O2 TAX/Oxy Hacker/Franquia ignora `selectedClosers`** — soma todos os cards de venda da BU sem aplicar `matchesCloserFilter`.
2. **Meta de O2 TAX/Oxy Hacker/Franquia ignora rateio por closer** — `getFilteredFaturamentoMeta` em `useConsolidatedMetas.ts` só aplica % de `closer_metas` quando `bu === 'modelo_atual'`. Para as outras BUs devolve a meta inteira.
3. **Inconsistência "todos selecionados"** — o bloco monetário usa `selectedClosers` cru em vez de `effectiveSelectedClosers`. Se o usuário marca todos os closers disponíveis, deveria valer como "sem filtro" (igual aos demais indicadores), mas hoje entra no ramo filtrado.

## Mudanças

### 1. `IndicatorsTab.tsx` — função `getRealizedMonetaryForIndicator` (linhas ~2050-2192)

- Trocar todas as ocorrências de `selectedClosers` por `effectiveSelectedClosers` nos cases `faturamento`, `mrr`, `setup`, `pontual`.
- **Aplicar filtro de closer também em O2 TAX**: usar `o2TaxAnalytics.getCardsForIndicator('venda').filter(card => matchesCloserFilter(card.closer || card.responsavel || ''))` quando o filtro estiver ativo.
- **Aplicar filtro de closer em Oxy Hacker e Franquia**: substituir `getOxyHackerValue('venda', …)` e `getExpansaoValue('venda', …)` por uma soma sobre os cards de venda do hook de analytics correspondente (`useOxyHackerAnalytics` / `useExpansaoAnalytics`) filtrados por `matchesCloserFilter`. Quando não houver filtro, manter o caminho atual (helpers de período).

### 2. `useConsolidatedMetas.ts` — função `getFilteredFaturamentoMeta` (linhas ~178-218)

- Remover a restrição `if (bu === 'modelo_atual')` e aplicar o rateio por % do closer (`getFilteredMeta`) para **todas as BUs** quando `closerFilter` estiver presente.
- Lógica unificada: para cada BU no período, calcular `vendas = faturamento / BU_TICKETS[bu]`, aplicar `getFilteredMeta(vendas, bu, mes, closers)`, multiplicar de volta pelo ticket.
- O rateio depende de `closer_metas` ter percentuais para cada BU/mês/closer. Se não houver entry, o `getPercentage` retorna o `defaultPercentage` (igual entre closers da BU), o que mantém comportamento previsível.

### 3. `IndicatorsTab.tsx` — `getMetaMonetaryForIndicator` (linha ~2195)

- Trocar `selectedClosers.length > 0 ? selectedClosers : undefined` por `effectiveSelectedClosers.length > 0 ? effectiveSelectedClosers : undefined` para consistência.

## Fora de escopo

- Filtro de SDR sobre acelerômetros monetários (continua não aplicado, pois receita é atribuída a closer e não a SDR).
- SLA (não é monetário e não depende de closer).
- Mudanças no card de Vendas (volume) — já filtra corretamente.
- Edição de `closer_metas` (estrutura permanece).

## Resultado esperado

Quando o usuário ativar o filtro de Closer:
- **Realizado monetário** soma apenas vendas onde o closer do card está na seleção, em todas as BUs do filtro de BUs.
- **Meta monetária** é rateada pela soma dos % dos closers selecionados (de `closer_metas`) para cada BU/mês.
- Marcar todos os closers disponíveis = mesmo comportamento que nenhum filtro (consistente com leads, MQLs, RM, RR, vendas).