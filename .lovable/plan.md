## Diagnóstico

O gráfico mês a mês usa o `rowMap`, que para as colunas de 2025 (`jul25..dez25`, `q325`, `q425`) lê de `sheetRows` (hook `useIndicators26Raw` → edge function `read-marketing-sheet` modo `raw`).

Hoje o modo `raw` lê **apenas** a aba `Indicadores 26`, mapeando colunas B..R. Nessa aba, as colunas J..Q (rotuladas como Jul/25..Q4/25) estão vazias/zeradas — os números históricos de 2025 vivem na aba separada `Indicadores 25` (gid `2102339529`). Resultado: na tabela e no gráfico, todo 2025 aparece como `0`/`—` e a linha não pega esses pontos.

O snapshot estático (`src/data/indicators26Snapshot.ts`) reflete exatamente isso: `jul25..dez25 = 0.0` para praticamente todas as linhas.

## O que vou fazer

### 1. Edge function `read-marketing-sheet` — modo `raw`
Estender o handler para também buscar a aba `Indicadores 25` e mesclar Jul..Dez/25 + Qs por linha:

- Buscar `Indicadores 26` (como hoje) → produz `values` para 2026 + colunas vazias de 2025.
- Buscar `Indicadores 25` em paralelo.
- Para cada linha de `Indicadores 25`, identificar o indicador via `findMetricKey(label)` (já existente, com todas as variações de nome).
- Construir um índice `metricKey → { jul25, ago25, set25, q325, out25, nov25, dez25, q425 }` lendo as colunas corretas da aba 25:
  - Jul=J(9), Ago=K(10), Set=L(11), Q3=M(12), Out=N(13), Nov=O(14), Dez=P(15), Q4=Q(16).
- Ao montar `out` (linhas de 2026), para cada linha resolver o `metricKey` e, se houver match no índice 2025, sobrescrever os 8 campos de 2025 com os valores reais (mantendo `null` quando a célula original for vazia/erro — não forçar `0`).
- Se uma linha de 2026 não tiver `metricKey` conhecido, manter o comportamento atual (valores 2025 = null/0).

### 2. Sem mudanças no front
`useIndicators26Raw`, `ConsolidatedIndicators26Section` e `IndicatorTrendDialog` já consomem `values[jul25..dez25]` corretamente. Assim que a function retornar dados reais de 2025, tabela e gráfico passam a exibir a série histórica completa.

### 3. Fallback
Não vou regenerar o snapshot estático agora (ele continua servindo como último recurso quando a edge function falha). Posso fazer isso num passo seguinte se quiser persistir 2025 também no snapshot.

## Detalhes técnicos

- Arquivo a editar: `supabase/functions/read-marketing-sheet/index.ts` (bloco `if (mode === 'raw')`, ~linha 398–435).
- Reutilizo `fetchSheetData`, `findMetricKey`, `normalizeText` já existentes no arquivo.
- Erros tipo `#DIV/0!`, `#N/A` continuam mapeados para `null` (helper `isError` local mantido).
- A função roda com deploy automático após o salvar.

## Validação

Após o deploy:
1. Abrir aba Marketing → Indicadores → expandir uma linha conhecida (ex.: "Mídia Google Ads") na tabela e conferir Jul/25..Dez/25 batendo com a planilha.
2. Clicar na linha → verificar que o gráfico desenha pontos de Jul/25 até o mês corrente de 2026, sem buraco em 2025.
3. Conferir 2–3 indicadores de tipos diferentes (BRL, INT, %) para garantir que o mapeamento de `metricKey` cobre as variações de nome entre as duas abas.