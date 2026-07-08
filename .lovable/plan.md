## Objetivo

Todas as etapas do funil das 3 frentes G4 (Lives, Eventos, Seller) ficam clicáveis. Ao clicar, abre um dialog listando os cards do Pipefy atribuídos àquela live/evento específico naquela etapa, com link direto para o card.

## Atribuição card → live/evento

Nova função `matchLiveFromCard(card, lives)` em `src/lib/g4Events.ts`, com prioridade:

1. **Texto** — normaliza `origemLead + campanha + tipoOrigem + fonte + paginaOrigem` e procura menção à data da live (`20/05`, `2026-05-20`, `20-05`) ou label (`live 20/05`).
2. **Janela** (fallback) — se nenhuma live casou por texto, escolhe a live cujo intervalo `[date, date + captureWindowDays]` contém `dataEntrada`. Se mais de uma, pega a mais próxima anterior.

Para eventos já existe `matchEventoFromCard` (usa tokens + desempate por data) — reutilizado.

Para seller não há sub-agrupamento: todos os cards seller vão para o mesmo drill-down.

## Mapeamento etapa → fases Pipefy

Reutiliza o mapa já usado em `useG4Analytics` (PHASE_TO_FUNNEL). O dialog recebe `stageKey` (`leads|mql|rm|rr|proposta|venda|inscritos|entraram|mao`) e filtra os cards do escopo cuja `faseAtual` pertence às fases daquela etapa. Para `leads/mql/rm/rr/proposta/venda` a filtragem usa histórico (allCards) para respeitar o princípio de throughput: card conta na etapa se já passou por lá. Para `inscritos/entraram` (que vêm de override oficial da G4, sem lista nominal) o dialog continua mostrando o aviso "lista não disponível no nosso banco" que já existe em `LiveLeadsDialog`.

## Mudanças de arquivo

### `src/lib/g4Events.ts`
- Adicionar `matchLiveFromCard(card, lives)` (texto → janela).

### `src/lib/g4Funnel.ts`
- Adicionar helper `cardsByStage(cards, allMovements, stageKey)` que devolve cards únicos que passaram pela etapa (usa histórico para leads/mql/rm/rr/proposta, estado atual para mão/venda).

### `src/components/planning/g4/LiveLeadsDialog.tsx`
- Habilitar listagem para todas as etapas do funil (não só `mao`/`venda`). Mantém o aviso "lista não disponível" apenas para `inscritos`/`entraram`.
- Coluna extra "Etapa atingida" já implícita via `faseAtual`.

### `src/components/planning/g4/LivesSection.tsx`
- `onStageClick` já existe. Passar `allCards` (para histórico) além dos cards representativos.
- No cálculo de `cards` do dialog, filtrar por `matchLiveFromCard` quando `selectedLive` é null (agregado mostra todos os cards atribuídos a qualquer live).
- Suportar todos os `stageKey` chamando `cardsByStage`.

### `src/components/planning/g4/EventosSection.tsx`
- Adicionar estado `dialogStage`, passar `onStageClick={setDialogStage}` ao `FunnelDeluxe`.
- Renderizar `LiveLeadsDialog` com escopo = `scopedCards` (já filtrados por evento) + `cardsByStage`.

### `src/components/planning/g4/SellerSection.tsx`
- Idem Eventos, com escopo = `sellerCards`.

### `src/components/planning/g4/FunnelDeluxe.tsx`
- Confirmar que `onStageClick` é disparado para todas as stages (não só mão/venda). Se hoje está restrito, liberar.

## Fora de escopo

- Não altera métricas nem cálculos existentes — só adiciona drill-down.
- Não muda `useG4Analytics`.
- Não cria endpoint novo — usa cards já carregados de `useModeloAtualAnalytics`.
