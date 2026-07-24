## Problema

Os KPIs do topo do `/dash-g4` (Leads, MQLs, Em contato, Quentes, Fechados, TCV, Ticket médio) e a linha de **Total** da tabela consolidada divergem dos drill-downs. Exemplo relatado: 5 Quentes no card → 3 ao abrir; 11 Fechados no card → 9 ao abrir (9 é o correto).

## Causa raiz

Em `src/components/planning/g4/G4ConsolidatedDashboard.tsx`:

- `totals` (linha 788) é calculado somando os contadores de cada `LiveGroup` do array `groups`. Um mesmo lead que participou de mais de uma live é contado uma vez em cada grupo → **inflate**.
- A linha de **Total** da tabela (linhas 1137-1138) usa o mesmo `totals` inflado.
- Os drill-downs usam `mergeGroups` (linha 440), que deduplica leads por e-mail antes de contar — por isso o número do drill é o correto.
- O fix anterior (`pickClosestLive`) só deduplica leads **ganhos** dentro de `buildGroups`; leads em outros estados (Quentes, MQLs, Em contato, Perdidos) continuam duplicados entre grupos. E mesmo para ganhos, existem casos em que `pickClosestLive` não colapsa (ex.: lead sem `dataGanho` claro ou grupos sintéticos).

## Correção

Substituir o cálculo de `totals` para deduplicar leads por e-mail/nome ao longo de todos os `groups` visíveis, usando exatamente a mesma lógica do `mergeGroups`:

1. Percorrer `groups`, acumular leads únicos numa `Map` chaveada por `email || nome` (lowercase).
2. Derivar todos os agregados a partir desse conjunto único:
   - `inscritos` = tamanho do conjunto
   - `mqls` = filtro `isMqlByFaturamento(faixa)`
   - `emContato` = filtro `isInContact(faseAtual)`
   - `quentes` = `temperatura === "Quente" && !isG4Sale(l) && !isWon(faseAtual)`
   - `fechados` = filtro `isG4Sale(l)`
   - `perdidos` = filtro `isLost(faseAtual)`
   - `mrr/setup/pontual/tcv` = soma somente sobre os `fechados`
3. Manter `groups` como está para a árvore/tabela por categoria (a granularidade por live continua fazendo sentido lá — cada célula da linha da live representa o que aconteceu naquela live).
4. Atualizar a linha **Total** da tabela consolidada (linhas 1137-1138 e demais colunas dessa linha) para usar os novos `totals` deduplicados — o que já acontecerá automaticamente ao trocar o `useMemo`.

Nada mais muda: drill-downs, células por live e árvore por categoria continuam com o mesmo comportamento atual.

## Verificação

Após aplicar, comparar no `/dash-g4`:
- KPI "Fechados" deve bater com o drill-down "Vendas fechadas · Consolidado" (esperado: 9).
- KPI "Quentes" deve bater com o drill-down "Leads Quentes" (esperado: 3 no exemplo relatado).
- Linha Total da tabela deve refletir os mesmos números dos KPIs.
