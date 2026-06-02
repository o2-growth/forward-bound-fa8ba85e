## Problema

O CFO Gustavo (role `cfo`) está vendo churns, tratativas e isentamentos de **todos os CFOs** nas abas "Visão Geral" e "Churn" da aba Operação.

## Causa raiz

Em `src/components/planning/CustomerSuccessTab.tsx`:

- O lock-in já injeta `filters.cfos = [lockedCfoName]` corretamente (linhas 48-55), e o `ChurnDossierSection` respeita `globalCfos` (já filtra).
- **Mas** o objeto `operacao` vindo de `useJornadaData` é passado **bruto** (sem filtro) para:
  - `<VisaoGeralCS operacao={operacao} />` (linha 448) — usado para KPIs/tabelas de churn/tratativas/isentamentos na Visão Geral.
  - `<OperacaoKpisStrip operacao={operacao} />` (linha 534) — strip de KPIs no topo da aba Churn, com tabelas de tratativas, isentamentos, tempo de tratativa e churns Oxy. Nenhuma dessas tabelas internas filtra por `cfo`.

Resultado: Gustavo vê linhas com `cfo` de outros CFOs nessas tabelas, mesmo com o filtro travado.

## Correção

Em `CustomerSuccessTab.tsx`, criar um `filteredOperacao` (memoizado) que filtra cada array de `operacao` (`tratativasResolvidas`, `isentamentos`, `churnsOxy`, `tempoTratativaChurn`) pelo campo `cfo` quando `filters.cfos.length > 0`. Recalcular os agregados (`tratativasResolvidasCount`, `valorIsentadoTotal`, `churnsOxyCount`, `tempoMedio/Mediano`) a partir das listas filtradas.

Passar `filteredOperacao` em vez de `operacao` para:
- `VisaoGeralCS` (Visão Geral)
- `OperacaoKpisStrip` (aba Churn)
- O cálculo `resolvidasNoPeriodo` dentro do `ChurnDossierSection` (linha 537)

Nenhuma outra mudança de schema, RLS ou Edge Function. O comportamento para admins (`filters.cfos = []`) permanece idêntico — não filtra nada.

## Arquivos alterados

- `src/components/planning/CustomerSuccessTab.tsx` — adiciona memo `filteredOperacao` e substitui as 3 passagens.
