## Problema

No Pace Comercial, ao selecionar a **Dani (Daniel Trindade)**, uma proposta quente que é dela não aparece em "Oportunidades quentes" da coluna dela. O card entra no total geral mas some quando filtra pelo closer.

## Causa raiz

`hotOpportunityItems` (em `src/components/planning/IndicatorsTab.tsx`, linhas ~3341-3388) é construído usando **apenas a última linha (`latestById`) de cada card** e depois passado por `toDetailItem`, que preenche `item.closer = card.closer` da linha mais recente.

No `CommercialPaceDashboard`, a agregação/filtro por closer usa `personName(item) = item.closer` (linha 70-75). Se a última movimentação do card **não tem o campo "Closer responsável" preenchido** (ex: card ainda em fase anterior à atribuição de closer, ou movimentação recente entrou sem esse campo), o hot vai para o bucket "Sem responsável" e não conta para a Dani — mesmo que em outra linha do histórico ela esteja como Closer.

Além disso, `personName` ignora o fallback já existente em `toDetailItem.responsible` (que usa `card.closer || card.responsavel`).

## Correção

Duas mudanças pequenas, ambas em código de apresentação (sem tocar em lógica de negócio de funil/metas):

### 1) `src/components/planning/IndicatorsTab.tsx` — resolver o Closer "efetivo" do card quente varrendo o histórico

Ao montar `hotOpportunityItems`, antes de chamar `toDetailItem(card)`:

- Percorrer todas as linhas `rowsById.get(card.id)` ordenadas por `dataEntrada` desc.
- Pegar o **último `closer` não-vazio** ao longo do histórico do card.
- Fallback: `sdr` do histórico mais recente, ou `responsavel`.
- Injetar esse valor no card antes do `toDetailItem` (ex: `{ ...card, closer: effectiveCloser }`), para que `item.closer` já venha correto.

Isso garante que um card quente atualmente em fase "sem closer" ainda seja atribuído à Dani se ela foi o Closer registrado em qualquer movimentação anterior.

### 2) `src/components/planning/indicators/CommercialPaceDashboard.tsx` — fallback defensivo em `personName`

Ajustar `personName` (linha 70) para: `item.closer || (item as any).responsible || ''` antes do trim/exclusão. É uma rede de segurança caso outros consumidores futuros passem items sem `closer` explícito.

## Efeito esperado

- Card quente da Dani (Daniel Trindade) passa a aparecer na linha dela em "Oportunidades quentes" quando `selectedCloserLocal = "all"` **e** quando ela é o closer selecionado no filtro individual do Pace.
- Nenhum impacto em totais gerais de faturamento, funil ou metas — a mudança altera apenas a **atribuição por closer** dos hots.
- Cards quentes que realmente nunca tiveram Closer em nenhuma linha continuam em "Sem responsável" (comportamento correto).

## Arquivos alterados

- `src/components/planning/IndicatorsTab.tsx` (bloco `hotOpportunityItems`, ~3341-3388)
- `src/components/planning/indicators/CommercialPaceDashboard.tsx` (função `personName`, ~70-75)
