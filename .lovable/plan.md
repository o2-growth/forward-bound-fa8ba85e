## Contexto

Hoje, no card "Valor isentado (Atendimento O2)", somamos **toda** tratativa finalizada com `Valor Isentado > 0`, sem exigir que o cliente tenha virado churn nem que o motivo seja "Atendimento O2". Já o card "Churns com problemas na Oxy" lista qualquer cliente em fase inativa com referência a Oxy, mesmo sem `data de encerramento` válida (ficando fora do filtro por período).

A jornada/dossiê de Abril mostra **8 churns**. Os dois cards precisam ser estritamente subconjuntos desses 8:

- **Valor isentado (Atendimento O2)** = só os churns do período cujo `motivoChurn` = "Atendimento O2", somando o `Valor Isentado` da tratativa correspondente.
- **Churns com problemas na Oxy** = só os churns do período cujo motivo principal/cancelamento/problemasOxy menciona Oxy.

## Mudanças

### `src/hooks/useJornadaData.ts`

1. **Construir lista canônica de churns** (`churnsList`) iterando `allClientes` filtrando por `INACTIVE_PHASES`, anexando `churnDate = churnDateByTitulo.get(titulo.toLowerCase())` e `motivoChurn` já consolidado (com `CHURN_OVERRIDES`). Isso garante que os dois cards partam exatamente do mesmo universo do dossiê.

2. **Mapa `valorIsentadoByTitulo`**: a partir do loop atual de `tratativas`, guardar `Map<tituloLower, { valor, data }>` (somando se houver mais de uma tratativa).

3. **Refazer `isentamentos`** para conter **apenas churns** com `motivoChurn === 'Atendimento O2'`:
   ```ts
   isentamentos = churnsList
     .filter(c => normalize(c.motivoChurn) === 'atendimento o2')
     .map(c => ({
       titulo: c.titulo,
       cfo: c.cfo,
       motivoChurn: c.motivoChurn,
       valor: valorIsentadoByTitulo.get(c.titulo.toLowerCase())?.valor ?? 0,
       data: c.churnDate,   // usa data do churn (não da tratativa) para casar com o filtro do dossiê
     }));
   ```
   (mantemos itens com `valor = 0` para que a contagem do card bata com a do dossiê; a soma usa só os > 0.)

4. **Refazer `churnsOxy`** para garantir que a `data` é a do churn e que entram apenas itens com `churnDate` no período (o front já filtra por `inRange(data)`, então basta sempre setar `data: churnDate`). Manter o critério `hasOxy` atual.

### `src/components/planning/cs/OperacaoKpisStrip.tsx`

- Atualizar tooltip do card "Valor isentado (Atendimento O2)": deixar claro que conta **apenas churns** do período cujo motivo é "Atendimento O2".
- No diálogo de isentados, esconder linhas com `valor === 0` (ou marcar como "—") para não confundir.
- Sem mudanças no card "Churns com problemas na Oxy" — o `inRange(data)` já cuida do recorte agora que `data` será sempre o `churnDate`.

## Resultado esperado

Em Abril, com 8 churns no dossiê:
- Card "Valor isentado (Atendimento O2)" mostra apenas os churns desse mês com motivo "Atendimento O2" e soma o valor isentado das tratativas ligadas a eles.
- Card "Churns com problemas na Oxy" mostra apenas os churns desse mês cujo motivo cita Oxy.