## Revisão da hipótese

Você tem razão — se só há 5 sem Closer, o gap (79 vs 59 = 20) não vem daí. O que realmente acontece é que **o acelerômetro e a matriz usam fontes diferentes**:

- **Acelerômetro RR** = `getQtyForPeriod('rr')` dos hooks agregadores por BU (`useModeloAtualMetas`, `useO2TaxMetas`, etc.). Esses hooks contam movimentações por período com regras próprias (dedup mensal por card+fase, cohort de mês, etc.).
- **Matriz nova** = `itemsByIndicator["rr"]`, que é a lista de drill-down (`getDetailItemsWithFullHistory` / `getItemsForIndicator`). Essa lista pode:
  1. Excluir cards sem Closer (5 casos confirmados);
  2. Filtrar por `inRange(item.date, ...)` usando o timestamp do item, enquanto o agregador usa o mês da movimentação;
  3. Não incluir BU cujo hook não expõe drill-down completo (ex.: Franquia/OxyHacker via analytics separado);
  4. Aplicar `matchesOrigemFilter` diferente do que o acelerômetro aplica.

Ou seja, o número correto de "reuniões realizadas no período" é o do acelerômetro (79). A matriz precisa consumir a mesma fonte.

## Plano de correção

1. **Diagnóstico rápido (sem alterar UI):** adicionar um `console.debug` temporário em `CloserPerformanceMatrix.tsx` listando `id`, `closer`, `date`, `bu` de cada reunião contada, para confirmar quais 20 estão faltando (sem Closer × fora do range × BU ausente). Remover depois.
2. **Unificar fonte:** em `IndicatorsTab.tsx`, no ponto onde abrimos a matriz, passar a mesma lista que alimenta o acelerômetro (usar `getItemsForIndicator('rr')` sem o filtro de `inRange` extra, já que o hook já aplica período), e o mesmo para `venda` e `proposta`. Remover o `inRange` interno da matriz — deixar o filtro de período apenas na origem.
3. **Sem Closer:** adicionar coluna "Sem Closer" só se houver ao menos 1 item nessa condição, para que o Total da matriz **bata exatamente com o acelerômetro (79)**.
4. **Validação:** abrir a matriz com os mesmos filtros do print e conferir Total Equipe = 79 reuniões. Se ainda divergir, o log do passo 1 mostra qual filtro está eliminando os cards e ajusto pontualmente.

Nenhuma alteração nos agregadores nem no acelerômetro — só na matriz e na forma de alimentá-la.
