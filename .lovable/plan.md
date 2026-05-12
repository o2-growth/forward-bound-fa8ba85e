## Aplicar filtro de data global aos KPIs de Operação

Hoje os 3 cards seguintes mostram totais acumulados (sem respeitar o filtro de período do CS):
- Tratativas resolvidas com sucesso
- Valor isentado (Atendimento O2)
- Churns com problema na Oxy

O CS Tab já tem `csStartDate`/`csEndDate` (passado como `globalDateRange` p/ ChurnDossier). Vamos reusar esse mesmo filtro.

## Mudanças

### `src/hooks/useJornadaData.ts`

Anexar a **data de referência** em cada item dos arrays:

- `tratativasResolvidas`: adicionar `data: Date | null` = `parseDate(row['Saída'] || row['Saida'] || row['Data encerramento'] || row['Entrada'])` (data em que a tratativa foi finalizada).
- `isentamentos`: adicionar `data: Date | null` = mesma regra acima (quando o valor isentado foi registrado/finalizado).
- `churnsOxy`: adicionar `data: Date | null` = `churnDateByTitulo.get(tituloLower)` (data de encerramento do projeto).

### `src/components/planning/cs/OperacaoKpisStrip.tsx`

- Adicionar prop opcional `dateRange?: { from: Date; to: Date }`.
- Atualizar interface `OperacaoKpisData` para incluir o novo `data` em cada item.
- Criar `inRange(d)` helper: `!dateRange || (d && d >= dateRange.from && d <= dateRange.to)` — itens sem data caem fora quando há filtro ativo.
- Filtrar **antes** de calcular contagens/somas:
  - `resolvidasFiltered = operacao.tratativasResolvidas.filter(t => inRange(t.data))` → usar `.length` no card e na tabela.
  - `isentamentosFiltered = operacao.isentamentos.filter(i => inRange(i.data))` → soma e contagem.
  - `churnsOxyFiltered = operacao.churnsOxy.filter(c => inRange(c.data))` → contagem, soma MRR e tabela.
- Mostrar pequena legenda no rodapé de cada card quando o filtro estiver ativo: `"no período selecionado"`.
- Manter o card de "Tempo levantar a mão → churn" inalterado (já tratado anteriormente).

### `src/components/planning/CustomerSuccessTab.tsx`

- Passar `dateRange={{ from: csStartDate, to: csEndDate }}` para `<OperacaoKpisStrip>` (linha ~458).

## Sem mudança

- Lógica de derivação dos itens no hook permanece a mesma; apenas anexamos a data.
- Outros cards/seções do CS Tab seguem como estão.
