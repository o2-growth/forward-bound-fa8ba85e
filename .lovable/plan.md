## Objetivo
Excluir a fase **"G4 Tools"** (e variações) do contador "Em Contato" do Dashboard Consolidado do G4. Leads parados nessa fase não devem ser considerados como estando em tentativa/atendimento comercial.

## O que muda

**Arquivo:** `src/components/planning/g4/G4ConsolidatedDashboard.tsx`

### 1. Blacklist na regra `isInContact`
Adicionar checagem no início da função: se a fase normalizada contém `g4 tools` (ou `g4tools`), retorna `false` imediatamente — mesmo antes do fallback "ativo no pipeline".

### 2. Também remover do fallback de "ativo"
Incluir `g4 tools` na lista de fases que não contam como pipeline ativo, para que o fallback também ignore.

## Fora do escopo
- Não altera outras fases nem outras BUs.
- Não altera MQL/Quente/Ganho/Perdido.

## Validação
Após implementar: abrir G4 › Dashboard Consolidado › clicar em "Em Contato" e confirmar que nenhum lead com Fase Atual = "G4 Tools" aparece na lista.