## Objetivo

Duplicar o gráfico atual **"Reuniões por dia"** (que mostra `booking_date` — a data em que a reunião está marcada) e criar uma versão chamada **"Futuras reuniões"** que, em vez de agrupar pela data agendada, mostre **quantas reuniões foram geradas (agendadas) pelo Typeform por dia**, considerando os **últimos 15 dias** com base na data de criação do lead.

## O que muda

### 1. Novo dataset no `TypeformDashboard.tsx`
Derivar uma série diária a partir de `allLeads` (`useDiagLeadsFull`):

- Filtrar leads com `agendado === true` e `created_at` válido.
- Agrupar por dia (`created_at.slice(0,10)`).
- Considerar somente os **últimos 15 dias** (incluindo hoje), preenchendo dias sem reuniões com `0` para o eixo X ficar contínuo.
- Formato igual ao consumido pelo `BookingsByDayChart`: `{ booking_date: string, reunioes: number }` — assim reaproveitamos o mesmo componente.

### 2. Render no dashboard
Logo abaixo do gráfico atual `Reuniões por dia`, renderizar um segundo `BookingsByDayChart` com:

- `title="Futuras reuniões"`
- `description="Reuniões geradas pelo Typeform por dia — últimos 15 dias"`
- `data` = a nova série derivada.
- `onBarClick` = handler que abre o drawer filtrando `allLeads` por `created_at` no mesmo dia (e `agendado === true`), mostrando breakdown por SDR e faturamento (reaproveitando `keepFaturamento`).

### 3. Suporte no `BookingsByDayChart`
Se hoje o título/descrição estão hard-coded dentro do componente, adicionar props `title` e `description` (com defaults atuais) para permitir customização sem duplicar o componente. Caso já recebam por prop, nenhuma mudança necessária.

## Arquivos afetados

- `src/components/planning/typeform/TypeformDashboard.tsx` — novo `useMemo` para a série de 15 dias, novo handler de clique, novo `<BookingsByDayChart>`.
- `src/components/planning/typeform/BookingsByDayChart.tsx` — apenas se precisar expor `title`/`description` como props.

## Fora de escopo

- Nenhuma alteração em views Supabase, hooks de dados, ou no drawer.
- Sem mudanças no gráfico original "Reuniões por dia".
