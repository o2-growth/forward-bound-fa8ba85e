## Objetivo
Corrigir o "Em Contato = 0" no Dashboard Consolidado do G4 reconhecendo as fases de contato específicas do G4 (que têm nomes diferentes das fases de contato do Modelo Atual).

## O que muda

**Arquivo:** `src/components/planning/g4/G4ConsolidatedDashboard.tsx` (e, se necessário, o helper de classificação de fase usado nesse dashboard).

### 1. Ampliar o matcher de "Em Contato" para o G4
Hoje o "Em Contato" só bate em nomes fixos tipo `Tentativas de contato`. Vou trocar por um matcher normalizado (trim + lowercase + sem acento) que aceita qualquer fase que contenha:

- `tentativa` + `contato`  (cobre "Tentativa de contato G4", "Tentativas de contato - G4", "Tentativa de contato G4 Live", etc.)
- ou `contato` isolado quando a fase também contém `g4` (cobre variações como "Contato G4", "1º contato G4")
- ou `qualifica` + `g4` (caso a etapa de qualificação G4 seja onde eles paralisam antes de virar quente)

Isso é aplicado apenas no escopo do G4 Dashboard — não altera a definição de "Em Contato" dos Indicadores Comerciais.

### 2. Fallback seguro: "ativo no pipeline"
Caso um lead do G4 não esteja em fase de contato reconhecida, mas também não esteja em fase terminal (ganho / perdido / arquivado / contrato assinado / onboarding / operação), ele entra num contador auxiliar "Ativos" exibido no tooltip do KPI "Em Contato" — para você validar se ainda faltou algum nome de fase.

### 3. Drill-down
O drill-down do card "Em Contato" passa a listar todos os leads capturados pela nova regra, com coluna Fase Atual + link Pipefy, no mesmo padrão dos demais.

## Como validar depois de implementar
1. Abrir G4 › Dashboard Consolidado.
2. Conferir que "Em Contato" > 0 quando há Leads > MQLs > 0.
3. Clicar em "Em Contato" e verificar no drill-down se as Fases Atuais listadas são realmente fases de contato do G4 no Pipefy.
4. Se aparecer alguma fase estranha, você me passa o nome exato e eu removo da regra.

## Fora do escopo
- Não mexer em Indicadores Comerciais.
- Não mexer nas outras BUs (Expansão / O2 TAX / Franquia / Oxy).
- Não alterar definição de MQL, Quente, Fechado, Perdido.