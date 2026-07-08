## Problema

1. **Link ausente na tabela externa (G4 Real)**: A tabela fora do diálogo usa apenas `l.pipefyUrl` e cai no estado desabilitado "sem card no pipe" — não aplica a mesma lógica de fallback (`buildPipefyUrl` com busca por e-mail) que já existe no diálogo. Por isso o link "não aparece".
2. **UI/UX ruim** tanto no card clicável (tabela externa) quanto no detalhado (dialog): densidade alta, botão Pipefy pouco visível, layout apertado, sem hierarquia clara.

## O que fazer

### 1. `src/components/planning/g4/G4RealSection.tsx` (tabela externa)
- Extrair `buildPipefyUrl` para `LiveDetailDialog` (ou um helper `g4/pipefy.ts`) e reusar aqui.
- Substituir o `<a>` custom + tooltip "sem card" por um `Button` real com o mesmo padrão do dialog: sempre link (URL direta se existir; senão busca por e-mail; senão `—`).
- Melhorar densidade das linhas: `py-3` em vez de `py-2`, separadores mais suaves, hover mais evidente.
- Compactar coluna "Live(s)" com badge mais clara (só data curta) e agrupar Presente/Mão/Diag num só grupo de ícones coloridos (✓ verde / – muted) em vez de 3 colunas de badges "Sim".
- Header sticky no topo da tabela, com contador destacado.

### 2. `src/components/planning/g4/LiveDetailDialog.tsx` (dialog detalhado)
- Reorganizar colunas em grupos visuais: **Lead** (nome+email+empresa), **Valores** (MRR/Setup/Pontual/TCV agrupados à direita), **Pipe** (fase+dias+SDR+Closer), **Sinais** (Mão/Diag ícones), **Ação** (botão Pipefy destacado como `variant="default"` size sm com ícone + texto).
- Header do dialog mais respirado: título em uma linha, controles (Só MQL + contador + badge live) em uma linha abaixo.
- Zebra rows (`even:bg-muted/20`), border-b mais leve, sticky header dentro do ScrollArea.
- Formatar valores 0 como "—" muted em vez de "R$ 0" para reduzir ruído visual.
- Coluna "Fase atual" com badge colorida por tipo (Ganho verde, Perdido vermelho, resto neutro).

### 3. Helper compartilhado
- Criar `src/components/planning/g4/pipefy.ts` exportando `buildPipefyUrl(lead)` para ambos consumirem — remove duplicação e garante comportamento idêntico dentro e fora do dialog.

## Fora de escopo
- Backend / edge functions não mudam (link já vem do `g4-metrics` com `card_id` do COALESCE).
- Nenhuma mudança em métricas ou filtros de negócio.

## Validação
- Typecheck.
- Abrir preview: confirmar botão "Pipefy" visível em toda linha (com/sem `pipefyUrl`), abrir dialog e conferir o novo layout mais respirado.
