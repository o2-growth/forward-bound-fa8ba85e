## Mudança

Mover o card autônomo de pipes operacionais para **dentro** do card "Distribuição de Clientes Ativos" e generalizar para **todos os produtos**, usando apenas o campo `produto` da Central de Projetos (mesma fonte do resto da Visão Geral).

## Onde

`src/components/planning/cs/VisaoGeralCS.tsx`

## O que muda

1. **Remover** o componente autônomo `<PipeActiveCountsRow />` (e a função `PipeActiveCountsRow`).
2. **Remover** o hook `usePipeActiveCounts` do import (não é mais usado nesse card). O arquivo `src/hooks/usePipeActiveCounts.ts` pode permanecer (não quebra nada), mas marca como não utilizado.
3. **Reestruturar** o grid interno de "Distribuição de Clientes Ativos":
   - Hoje: `md:grid-cols-3` → Por tipo (1 col) + Por CFO (2 cols)
   - Novo: `md:grid-cols-4` → Por tipo (1 col) · **Por produto (1 col)** · Por CFO (2 cols)
4. **Nova subseção "Por produto"**:
   - Título: `POR PRODUTO` (mesmo estilo das outras subseções)
   - Agrupa `activeClientes` pelo campo `produto` (normalizado: trim + fallback "Sem produto")
   - Lista ordenada por contagem desc, em mini-tabela compacta (cabeçalho `Produto | Clientes | %`)
   - Mesmo visual da subseção "Por CFO" (barra de progresso fininha + número à direita)
   - Cada linha clicável → abre um `Dialog` com a lista de clientes daquele produto (cliente, CFO, fase, MRR, pontual) — reaproveita estilo do dialog "Por tipo".
5. **Tooltip explicativo** no título da seção: fonte `Pipefy · Central de Projetos · campo Produto`; conta cada cliente ativo exatamente 1 vez pelo produto principal do card; ignora produtos vazios.
6. **Rodapé**: linha italic pequena "Total ativos = N · cada cliente conta 1 vez pelo produto principal".

## Comportamento

- 100% client-side, em cima do array `clientes` que já chega no componente — zero novas chamadas de API/edge function.
- Loading: nenhum (dados já hidratados).
- Filtros globais (CFO, Produto, Data range) continuam afetando `clientes` upstream, então a contagem reflete o filtro corrente — comportamento esperado.

## Fora de escopo

- Não toca em "Por tipo" ou "Por CFO".
- Não muda a edge function `query-external-db`.
- Não altera o card de Churn nem o `OperacaoKpisStrip`.
- Hook `usePipeActiveCounts` e action `count_active_in_pipe` ficam no projeto mas deixam de ser usados aqui (limpeza opcional em PR futuro).
