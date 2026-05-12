## Problema

O KPI "Tempo levantar a mão → churn" mostra hoje **44 dias / 1 cliente** porque exige (1) 1ª tratativa registrada E (2) data de churn — só 1 cliente bate as duas no recorte atual. A regra também não respeita o filtro de período do dashboard.

## Nova regra

Universo = **todas as tratativas cuja 1ª entrada caiu dentro do período filtrado** (mesmo que o cliente ainda não tenha virado churn).

Para cada uma:
- Se o cliente **já virou churn** (fase Churn/Desistência/Arquivado e tem `churnDate`): `dias = churnDate − entradaTratativa` → entra na **média/mediana**.
- Se **ainda não virou churn**: aparece na lista do dialog como **"em andamento"** (`dias = hoje − entradaTratativa`, marcado como ongoing) e **NÃO** entra na média/mediana.

## Mudanças

**`src/hooks/useJornadaData.ts`** (bloco em ~L776-800)
- Substituir o loop atual (que itera `allClientes` em fase inativa) por um loop sobre `firstTratativaByTitulo`.
- Filtrar entradas pela janela do período já existente no hook (mesmo `dateInRange` usado em outros KPIs de Operação — verificar se há `periodStart/periodEnd` no escopo; se não, ler dos parâmetros `selectedPeriod`).
- Para cada título com 1ª tratativa no período:
  - Buscar `churnDate = churnDateByTitulo.get(titulo)` e fase atual em `allClientes`.
  - Se em fase inativa + churnDate válido → push `{ ..., diasAteChurn, status: 'churn' }`.
  - Senão → push `{ ..., diasAteChurn: hoje−entrada, status: 'ongoing', motivo: 'Em andamento' }`.
- Manter sanidade: descarta `dias < 0` ou `> 730`.
- `tempoMedioTratativaChurn` e `tempoMedianoTratativaChurn` calculados **só sobre `status === 'churn'`**.

**`src/components/planning/cs/OperacaoKpisStrip.tsx`**
- Atualizar interface `tempoTratativaChurn` para incluir `status: 'churn' | 'ongoing'`.
- Card: legenda mostra `"X churns / Y em andamento"` em vez de `"N clientes"`.
- Dialog: nova coluna **Status** (badge "Churn" vermelho / "Em andamento" cinza). Ordenar churns primeiro, depois em andamento. Texto explicativo do header atualizado.
- Atualizar tooltip do `Info` no card refletindo a nova regra.

## Sem mudança

- Outras métricas do strip de Operação (resolvidas, isentado, churns Oxy) seguem inalteradas.
- Dossiê de Churn segue inalterado.
