## Objetivo
Adicionar opção **"Sem SDR"** no filtro de SDR e **"Sem Closer"** no filtro de Closer da aba Indicadores Comercial, permitindo isolar cards sem responsável atribuído.

## Comportamento
- Aparecem como duas opções extras no MultiSelect (sempre visíveis, independente da BU selecionada — já que cards "órfãos" podem existir em qualquer BU).
- Selecionável junto com outros nomes (ex: "Carlos" + "Sem SDR" mostra cards do Carlos OU sem SDR).
- Selecionar só "Sem SDR" → mostra apenas cards com `sdr` vazio/null.
- O bypass "todos selecionados = sem filtro" continua valendo; "Sem SDR" conta como um valor a mais.

## Implementação (apenas `src/components/planning/IndicatorsTab.tsx`)

1. **Sentinelas** no topo do arquivo:
   ```ts
   const NO_SDR_VALUE = '__no_sdr__';
   const NO_CLOSER_VALUE = '__no_closer__';
   ```

2. **Opções extras** anexadas em `availableSDRs` e `availableClosers` (useMemo, linhas 694–724): adicionar `{ value: NO_SDR_VALUE, label: 'Sem SDR' }` e `{ value: NO_CLOSER_VALUE, label: 'Sem Closer' }` no fim de cada lista.

3. **Validação de seleção por BU** (linhas 727–746): preservar os sentinelas mesmo quando a BU muda — não removê-los dos `selectedSDRs/selectedClosers`.

4. **Função `matchesSdrFilter`** (linha 801) e **`matchesCloserFilter`** (linha 787):
   - Se `effectiveSelectedSDRs.includes(NO_SDR_VALUE)` e o card tem SDR vazio/null/whitespace → match.
   - Idem para closer.
   - Mantém a lógica atual de tokens para os demais valores.

5. **`sdrFilterForBU`** (linha 766): se o filtro ativo for **somente** `[NO_SDR_VALUE]`, retornar `undefined` (não filtra BU por nome de SDR; apenas a função `matchesSdrFilter` faz o trabalho).

6. **Inclusão de BU** (linhas 1037–1046): "Sem SDR" / "Sem Closer" não restringe nenhuma BU — todas continuam incluídas quando esses sentinelas estão ativos.

## O que NÃO muda
- Metas (`sdrFilterForBU`, `getFilteredMeta`, `useSdrMetas`, `useCloserMetas`): "Sem SDR/Closer" não tem meta atribuída → essas funções ignoram os sentinelas e tratam como "sem filtro de meta" para esse subconjunto.
- Componentes de UI dos `MultiSelect` (já renderizam dinâmico).
- Nenhuma mudança em hooks de analytics ou edge functions.

## Arquivos tocados
- `src/components/planning/IndicatorsTab.tsx` (única edição)

Confirma que posso seguir?