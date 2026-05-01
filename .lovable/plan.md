## Problema

Clientes do Everton como **União Tecnica**, **AVML** e **CAPTABLE** não aparecem nem na aba **CFOs** (ao clicar no card) nem na aba **Reuniões**.

A causa é regra de negócio: hoje o sistema considera "ativo" apenas quem está em `Onboarding` ou `Em Operação Recorrente`. Quem está em fases de tratativa (Triagem, Em Tratativa com CS, Plano de Ação, Conclusão, Financeiro) é tratado como inativo e **some da carteira do CFO**, mesmo que o CFO continue atendendo normalmente.

A pessoa em tratativa **continua sendo atendida** — então tem que aparecer na carteira do CFO e nas reuniões dele.

## Mudança

Tratar clientes "em tratativa" como ativos para efeito de **carteira do CFO** e **reuniões**, mantendo o destaque visual de risco. Não mexe em churn (esses continuam fora).

## Arquivos afetados

**1. `src/hooks/useJornadaData.ts`**
- Trocar `ACTIVE_PHASES = ['Onboarding', 'Em Operação Recorrente']` por uma noção de "ainda na carteira" = qualquer fase **exceto** as terminais (`Churn`, `Atividades finalizadas`, `Desistência`, `Arquivado`).
- Aplicar essa nova definição na construção de:
  - `activeClientes` (carteira do CFO)
  - agregados por CFO (`cfoMap`: contagem de clientes, MRR total, MRR em risco, taxa de entrega, health médio, NPS médio)
  - alertas (continuam só para clientes "ainda na carteira")
- Pipeline (PipelineView) continua mostrando só `Onboarding` / `Em Operação Recorrente` + a coluna virtual "Em Tratativa", já que essas são as fases visuais do funil. Sem mudança aqui.

**2. `src/components/planning/jornada/CfoView.tsx`**
- Trocar `ACTIVE_PHASES_LOCAL = ['Onboarding', 'Em Operação Recorrente']` pela mesma nova definição (excluir só as terminais).
- Resultado: ao clicar no card do Everton, clientes em tratativa aparecem na lista, com o badge "Risco de Churn" que já existe (`deriveStatus` já marca tratativa como `risco`).

**3. `src/components/planning/jornada/ReunioesView.tsx`**
- Sem mudança no filtro de tipo (continua só `Reuniões com Cliente`), mas o universo de clientes que alimenta a aba já vem do `useJornadaData`. Como `reunioes` lê direto de `pipefy_moviment_rotinas` (não depende de `activeClientes`), a aba já deveria mostrar — confirmar que esses 3 têm card de rotina do mês com `Tipo de Entrega = "Reuniões com Cliente"`. Se não tiverem, o problema é dado faltando no Pipefy, não código.

## Efeito esperado

- Card do Everton em **CFOs** passa a mostrar União Tecnica, AVML e CAPTABLE (e qualquer outro em tratativa) na lista de clientes.
- Contagem de clientes do CFO, MRR total e MRR em risco passam a refletir a carteira real (incluindo tratativa).
- Aba **Reuniões**: se o card de rotina existe no mês selecionado, vai aparecer. Se não aparecer mesmo assim, é porque não há card de rotina criado no Pipefy para o mês.
- Quem está em **Churn / Atividades finalizadas / Desistência / Arquivado** continua fora da carteira ativa (sem mudança).

## Validação

1. Abrir aba Jornada → CFOs → clicar no Everton.
2. Conferir se União Tecnica, AVML e CAPTABLE aparecem na lista, marcados como "Risco de Churn".
3. Conferir contadores no card do Everton (clientes / MRR total / MRR em risco) — devem subir.
4. Aba Reuniões com filtro CFO = Everton: conferir se passam a aparecer (se não aparecerem, é porque não há card de rotina no Pipefy).

## Não muda

- Pipeline continua com Onboarding / Em Operação / Em Tratativa.
- Aba Alertas continua igual.
- Lógica de churn, NPS, setup, rotinas — intactas.
- Nenhuma outra tela do dashboard.
