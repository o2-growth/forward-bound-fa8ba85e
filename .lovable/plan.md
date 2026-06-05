# Onboarding atrasado na aba Reuniões

Adicionar, dentro da aba **Reuniões** da Operação, um novo bloco mostrando os cards do pipe **Gestão de Rotinas CFO** (`pipefy_moviment_rotinas`) que estão atualmente nas fases:

- **Kick-off do Projeto**
- **Primeiras Entregas - Diagnóstico**

Cada lista mostra somente cards **atrasados** segundo o campo **`Overdue`** do Pipefy (mesma fonte de verdade que já alimenta o badge de tarefas atrasadas hoje).

## O que aparece para o usuário

- Bloco separado por fase, na mesma aba **Reuniões** (acima ou abaixo da tabela atual).
- Para cada fase: título da seção, contagem total de atrasados, e tabela com:
  - Cliente (Título), CFO Responsável, Data Prevista de Entrega, Dias de atraso, link para o card no Pipefy.
- Respeita o filtro de CFO já existente (CFO logado em modo `cfo` continua travado no seu nome).
- Se não houver atrasados em uma fase, mostra mensagem vazia padrão.

## Como o dado é obtido (técnico)

Tudo já está disponível no `useJornadaData` — `data.rotinas` é o conteúdo do pipe Gestão de Rotinas CFO. Não precisa nova chamada ao banco nem nova edge function.

1. **`src/hooks/useJornadaData.ts`** — depois do bloco que monta `reunioes` (linha ~826), construir um novo array `onboardingAtrasado`:
   ```ts
   const ONBOARDING_PHASES = ['Kick-off do Projeto', 'Primeiras Entregas - Diagnóstico'];
   const onboardingAtrasado = data.rotinas
     .filter(r => r['Fase'] === r['Fase Atual'])
     .filter(r => ONBOARDING_PHASES.includes(r['Fase Atual'] || ''))
     .filter(r => r['Overdue'] === true || r['Overdue'] === 'true')
     .map(r => ({
       id: String(r.ID),
       titulo: (r['Título'] || '').trim(),
       cfo: normalizeCfoName((r['CFO Responsavel'] || '').trim()),
       fase: r['Fase Atual'] || '',
       dataPrevista: parseRotinaDateOnly(r['Data Prevista Entrega']),
       diasAtraso: /* (now - dataPrevista)/86400000, mínimo 0 */,
     }));
   ```
   Retornar junto com o resto: `return { ..., onboardingAtrasado }`.

2. **`src/components/planning/jornada/types.ts`** — exportar interface `OnboardingAtrasadoCard`.

3. **`src/components/planning/CustomerSuccessTab.tsx`** — desestruturar `onboardingAtrasado` do `useJornadaData()` e passar para `<ReunioesView />`.

4. **`src/components/planning/jornada/ReunioesView.tsx`** — receber nova prop `onboardingAtrasado`, aplicar filtro de CFO já em uso na view, e renderizar duas seções (uma por fase) usando os componentes `Card` + `Table` já importados. Link para Pipefy usa `PipefyCardLink` com `PIPEFY_PIPES.rotinas`.

## Fora de escopo

- Não alterar a lógica de `processRotinas` (KPI de tarefas atrasadas continua agregando todas as fases não-terminais como hoje).
- Não criar nova aba.
- Não mudar a definição de "atrasado" — fica 100% no flag `Overdue` do Pipefy.
- Não mexer em filtros globais de data (esses cards são "estado atual", não dependem de período).
