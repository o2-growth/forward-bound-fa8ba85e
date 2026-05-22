## Tornar a contagem de Churns clicável na tabela CFO

Hoje, na aba CS → visão CFO, a linha "Churns" do P&L comparativo e o badge "{n} churns" nos cards mostram apenas o número. O usuário quer clicar e ver quais clientes compõem aquele número (no período filtrado).

### O que será feito

1. **Tornar clicável** o `<td>` da linha "Churns" (tabela comparativa) e o `Badge` de churns nos cards de CFO — apenas quando `churns > 0`. Visual: cursor-pointer + hover + ring no focus, mantendo o badge `destructive`.

2. **Reusar `ChurnKpiDrawer`** (já existe em `src/components/planning/cs/ChurnKpiDrawer.tsx`) para abrir um painel lateral com a lista de churns daquele CFO no período selecionado.

3. **Estado local em `CfoView`**: `drawerCfo: string | null`. Ao clicar, set CFO e montar `KpiDrawerData` com:
   - Título: `Churns — {CFO}`
   - Subtitle: período (`csStartDate → csEndDate`)
   - Colunas: `cliente`, `mrr`, `setup`, `lt`, `motivo`, `data`
   - Linhas: itens de `churnDossier` filtrados por `normalizeCfo(dossier.cfo) === cfo.nome` e `dataEncerramento` dentro do range. Quando `churnDossier` não tiver detalhes (mrr/motivo), fazer lookup em `clientes` por título normalizado para enriquecer.

4. **Sem mudanças de regra**: usa exatamente a mesma fonte (`churnDossier` com overrides oficiais) que já alimenta o número exibido — portanto a soma das linhas do drawer = número clicado.

### Arquivos afetados

- `src/components/planning/jornada/CfoView.tsx` — adicionar estado, handler, montagem do `KpiDrawerData` e render do `ChurnKpiDrawer`; aplicar `onClick` no `<td>` da linha Churns e no `Badge` dos cards.

Nenhuma mudança de schema, hooks ou lógica de negócio.