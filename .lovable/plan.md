
## O que temos hoje

- Cards do Pipefy (Modelo Atual) classificados como Live via `isCardLive` e associados a cada live por janela (`cardsForLive`, 3 dias após a data).
- Cada card tem: `titulo` (empresa), `contato`, `telefone`, `fase/faseAtual`, `dataEntrada`, `responsavel`, `origemLead`, id Pipefy → link direto.
- KPIs "Inscritos" e "Entraram" das lives já realizadas vêm de override manual (`LIVES_OFICIAIS`) — são **só números da planilha da G4**, não temos nome/e-mail dos inscritos no nosso banco.
- KPIs "Levantaram a mão" e "Vendas" vêm dos cards do Pipefy (fases MAO_PHASES / VENDA_PHASES) — nesses **temos a lista real**.

Ou seja, para a Live 21/05 conseguimos listar quem levantou a mão e quem fechou. Para "Inscritos/Entraram" só se a G4 nos mandar a lista da plataforma deles.

## O que vou fazer

1. **Tornar as barras do `FunnelDeluxe` clicáveis**
   - Adicionar prop opcional `onStageClick(stageKey)` e um estado hover/cursor-pointer quando existe handler.
   - Também tornar clicáveis os mini-números do "Comparativo entre lives" (mão / venda) para abrir a mesma modal já com a live pré-selecionada.

2. **Nova modal `LiveLeadsDialog`** (em `src/components/planning/g4/`)
   - Recebe: título da live (ou "Agregado"), stage (`mao` | `venda` | `entraram` | `inscritos`) e lista de cards.
   - Para `mao` e `venda`: tabela com **Empresa, Contato, Telefone, Fase atual, Data entrada, Responsável, Origem, link Pipefy**.
   - Para `inscritos` e `entraram`: mensagem clara "Lista de inscritos/participantes vem da plataforma da G4 — não temos nomes no nosso banco, apenas o total (X). Peça o export para a G4 se quiser detalhar."
   - Padrão visual do projeto (Dialog do shadcn, tabela existente, sem cores hardcoded).

3. **Ligar tudo em `LivesSection.tsx`**
   - Filtrar `liveCards` pela live selecionada (ou todas se "Agregado") e pelas fases da stage clicada, aplicando dedupe por card (última entrada) igual ao `computeCounts`.
   - Passar essa lista para o dialog.

## Detalhe técnico

- Nenhuma mudança em hooks/dados — só UI/apresentação sobre os cards que já carregamos.
- Divergência esperada entre override manual (planilha G4) e cards Pipefy: o dialog mostra explicitamente "X levantaram a mão segundo Pipefy" quando o override diverge da contagem computada, para não confundir.
- Arquivos tocados:
  - `src/components/planning/g4/FunnelDeluxe.tsx` (prop `onStageClick`, hover)
  - `src/components/planning/g4/LivesSection.tsx` (state modal + filtro cards)
  - `src/components/planning/g4/LiveLeadsDialog.tsx` (novo)
