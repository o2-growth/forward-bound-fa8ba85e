## Objetivo
Incluir a fase **"Oxy Integrada"** na lista de "Onboarding atrasado" da aba Jornada/CS, ao lado de "Kick-off do Projeto" e "Primeiras Entregas - Diagnóstico", trazendo os 24 cards que hoje estão invisíveis.

## Diagnóstico (já confirmado no banco)
Pipe `pipefy_moviment_rotinas` (Gestão de Rotinas CFO), fases ativas:
- Kick-off do Projeto: 5
- Primeiras Entregas - Diagnóstico: 23
- **Oxy Integrada: 24** ← não aparece hoje
- Execução de Rotinas: 119 (fora do escopo)
- Atrasado / Pendente: 5 (fora do escopo)

Hoje a lista só considera as duas primeiras fases e ainda cruza com a Central de Projetos exigindo que o cliente esteja na fase "Onboarding". Clientes com Oxy Integrada já estão majoritariamente em "Em Operação Recorrente", então seriam dropados mesmo se a fase fosse incluída.

## Mudanças

### 1. `src/hooks/useJornadaData.ts` (bloco "Onboarding atrasado", linhas ~1018–1089)
- Adicionar `'Oxy Integrada'` em `ONBOARDING_PHASES`.
- Ajustar o cruzamento com Central de Projetos: aplicar o filtro estrito apenas às fases de onboarding propriamente ditas (Kick-off / Primeiras Entregas). Para "Oxy Integrada" não filtrar por fase do cliente na Central (o cliente já está em operação) — só exigir que o `Título` exista em Central de Projetos como cliente ativo (Onboarding OU Em Operação Recorrente) para evitar lixo.
- Manter a regra de atraso atual: `Data Prevista Entrega` vencida (< hoje) ou flag `Overdue=true` do Pipefy. É exatamente o campo "Data Vencimento do card vencida" que o usuário pediu.
- Atualizar o tipo retornado: cada item já tem `fase`, então nenhum schema novo é necessário.

### 2. `src/components/planning/jornada/ReunioesView.tsx` (bloco "Onboarding atrasado", linhas ~356–432)
- Adicionar `'Oxy Integrada'` no array `ONBOARDING_PHASES` da view (usado para renderizar os sub-blocos por fase).
- Renomear o título visual de "Onboarding atrasado" para "Onboarding & Oxy Integrada atrasados" para refletir o novo escopo.
- Atualizar o tooltip "De onde vem" para citar também a fase "Oxy Integrada".

### 3. Tipos (`src/components/planning/jornada/types.ts`)
- Nenhuma mudança estrutural; o tipo `OnboardingAtrasadoCard` já carrega `fase` como string livre.

## Validação após implementar
- Conferir no console que a contagem total de "atrasados" passa a incluir os cards de Oxy Integrada com Data Prevista vencida.
- Validar visualmente no preview que aparece um terceiro bloco "Oxy Integrada" com a tabela de cards.
- Spot-check de 2–3 títulos contra Pipefy.

## Fora do escopo
- Pipe `pipefy_moviment_setup` (jornada OXY interna com R1..R4) — não é o que o usuário quer, conforme confirmado.
- Mexer em "Setup atrasados" (KPI separado, lógica de >90 dias).