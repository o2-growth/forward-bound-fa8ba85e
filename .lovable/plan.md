## Diagnóstico

Consultei o pipe **3.2 Gestão de Rotinas (CFO)** (306755752) e listei os 11 cards das fases de onboarding:

- Kick-off do Projeto: 2 cards (Data Prevista 12/06/2026 → ainda no futuro)
- Primeiras Entregas - Diagnóstico: 9 cards — vários com Data Prevista no passado (02/05, 06/05, 13/05, 21/05, 05/06) e outros futuros

**Problema:** em todos eles o campo `late` (=Overdue) do Pipefy vem `false`, mesmo nos que estão claramente vencidos (hoje é 05/06/2026). Como nosso filtro atual exige `Overdue === true`, todos são descartados e o bloco aparece vazio.

O campo `Overdue` no Pipefy não está sendo atualizado de forma confiável para esse pipe — não dá pra confiar nele como critério único.

## Correção

Em `src/hooks/useJornadaData.ts` (bloco `Onboarding atrasado`, linhas ~1009-1044), trocar o critério:

**Antes:**
```ts
const overdue = row['Overdue'] === true || row['Overdue'] === 'true';
if (!overdue) continue;
```

**Depois:** considerar atrasado quando `Data Prevista Entrega < hoje` (com fallback para o flag do Pipefy):
```ts
const dataPrevista = parseRotinaDateOnly(row['Data Prevista Entrega']);
const pipefyOverdue = row['Overdue'] === true || row['Overdue'] === 'true';
const dateOverdue = dataPrevista ? dataPrevista.getTime() < startOfTodayTs : false;
if (!pipefyOverdue && !dateOverdue) continue;
```

Onde `startOfTodayTs` = início do dia de hoje (`new Date(); setHours(0,0,0,0)`).

## Ajuste no tooltip

Em `src/components/planning/jornada/ReunioesView.tsx`, atualizar o texto explicativo do bloco para refletir o novo critério: "Cards nas fases Kick-off do Projeto / Primeiras Entregas - Diagnóstico com Data Prevista vencida (ou marcados Overdue pelo Pipefy). Fonte: pipe Gestão de Rotinas CFO."

## Fora de escopo

- Não mexer no KPI `tarefasAtrasadas` (segue lógica atual de rotinas).
- Não alterar outros pipes nem `processRotinas`.
- Sem novas chamadas, queries ou edge functions — usa os dados já carregados em `data.rotinas`.

## Resultado esperado

Os ~5 cards da fase "Primeiras Entregas - Diagnóstico" com Data Prevista entre 02/05 e 05/06 passam a aparecer no bloco "Onboarding atrasado", agrupados por fase, com a coluna "Dias de atraso" calculada corretamente.