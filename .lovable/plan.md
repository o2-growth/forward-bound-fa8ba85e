# Flag de performance no card "Faturamento — período" (Pace Comercial)

## Objetivo
Mostrar no card **Faturamento — período** de `CommercialPaceDashboard.tsx` uma flag/bolinha colorida indicando o status do vendedor selecionado (ou do time, quando "Todos os closers") frente à meta do período filtrado.

## Regra de cor (conforme pedido)
Compara `rev` (faturamento realizado no período filtrado) com `metaRef` (meta do período — a mesma variável que o dashboard já usa hoje para calcular `% atingido`, `Falta para a meta` e o `pace-badge`).

- 🔴 **Vermelha** — `rev === 0` (nada vendido no período com meta definida).
- 🟡 **Amarela** — `0 < rev < metaRef` (vendeu parte da meta).
- 🟢 **Verde** — `rev >= metaRef` (bateu ou superou a meta).
- ⚪ **Sem flag** — quando `metaRef === 0` (ex.: closer sem meta individual e sem meta consolidada no período). Mantém o comportamento atual "sem meta individual".

Isso respeita 100% a lógica existente de:
- período/data selecionados (`dateRange`) — já refletido em `rev` e `metaRef`;
- rateio por closer via `closer_metas` — já embutido em `metaRef` quando um closer é selecionado;
- fallback para meta do time quando "Todos os closers" está ativo.

## Onde renderizar
No topo do card "Faturamento — período" (linhas 581–599 do arquivo), ao lado do label **"Faturamento — período"**, antes do valor em R$. Assim a flag fica visível junto ao card de cada vendedor conforme o print.

Formato: bolinha 10px + label curto ("Meta batida" / "Parcial" / "Sem vendas"), com `title`/tooltip explicando o cálculo (`rev` vs `metaRef` do período).

## Detalhes técnicos
- Arquivo único: `src/components/planning/indicators/CommercialPaceDashboard.tsx`.
- Adicionar um helper local `getPaceFlag(rev, metaRef)` retornando `{ color, label, tone }` usando tokens semânticos existentes (`--cp-ok`, `--cp-warn`, `--cp-bad` — ou equivalentes já usados pelo `pace-badge`). Nada de cores hardcoded.
- Renderizar o chip dentro do bloco `.rev-head > div` (linha 583), acima do `Faturamento — período`.
- CSS: reutilizar as classes de badge já existentes no arquivo; adicionar 3 modificadores (`flag-ok`, `flag-warn`, `flag-bad`) apontando para os tokens semânticos.
- Nenhuma alteração em hooks, agregadores, metas ou fontes de dados — puramente apresentação.

## Fora de escopo
- Não alterar cálculo de meta, pace, projeção ou rateio de closers.
- Não mexer em outros cards (Oportunidades Quentes, Conversão do Funil, Ranking).
- Não adicionar nova coluna no Ranking de Closers (posso fazer numa próxima iteração se quiser).
