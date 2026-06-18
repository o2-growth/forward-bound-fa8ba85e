# Correções aba Pessoas

## 1. Bug: gráfico "Custo de pessoal por BU — 12 meses" mostra só 1 mês

**Causa:** `usePersonnelCostByBu` é chamado com o range do filtro (1 mês na maioria das vezes) e o filtro `periodInRange` corta a série ao range do filtro. O gráfico 12m herda essa série truncada.

**Fix:** chamar o hook uma segunda vez em paralelo com range fixo dos últimos 12 meses, exclusivamente para alimentar o `TwelveMonthCostByBu`. O card de "Custo Total Pessoal" e demais KPIs continuam usando o range do filtro normal.

- `PessoasTab.tsx`: adicionar `const pc12m = usePersonnelCostByBu({ startDate: subMonths(endOfMonth(dateRange.to), 11), endDate: endOfMonth(dateRange.to) })` e passar `pc12m.porBu` / `pc12m.corporativo` para `TwelveMonthCostByBu`.
- `receitaPorMes`: estender o map para cobrir os 12 meses (já existe lógica similar, só ajustar range).

## 2. CS e Corporativo devem virar CaaS (decisão aprovada)

**Onde:** `src/hooks/usePersonnelCostByBu.ts`

- Remover `"CS"` de `BU_KEYS` (continua sendo detectado internamente mas é remapeado).
- Em `detectBuFromLabel`: manter o reconhecimento de CS (regex `\bcs\b|customer success`), mas retornar `"CaaS"`.
- No loop que classifica categorias: quando bucket = `"Corporativo"`, redirecionar para `"CaaS"` (somar em CaaS em vez de criar bucket separado).
- O objeto `corporativo` retornado pelo hook passa a vir sempre vazio (`total: 0`, `categorias: []`) — mantido para não quebrar a interface de quem consome.
- Resultado: cards "Custo Corporativo", listagem de categorias corporativas, e fatia "Corporativo" do gráfico 12m ficam zeradas/ocultas naturalmente.

**Limpeza visual em `PessoasTab.tsx`:**
- Esconder o card "Custo Corporativo (não-BU)" quando `pc.corporativo.total === 0`.
- Esconder o bloco de listagem de categorias corporativas quando vazio.
- Ajustar o subtítulo "X BUs + Corporativo" para apenas "X BUs".

**Em `PessoasExtras.tsx` (`TwelveMonthCostByBu`):**
- Remover `"CS"` do `buColors` (não vai mais aparecer).
- Manter `"Corporativo"` no map mas só renderiza se houver série (já tem guard via `porBu.some(...) || bu === "Corporativo"` — trocar para checar série real).

## 3. Memória

Adicionar regra em `mem://logic/financial/dre-mapping-logic-v2` (ou criar nova `mem://logic/pessoas/bu-rollup`):
> Custo de pessoal: CS é considerado parte de CaaS. Categorias corporativas (sem sufixo de BU) também são roladas em CaaS. Não existem buckets independentes "CS" nem "Corporativo" no painel Pessoas.

## Fora de escopo
- Refator de outros painéis que ainda usam CS/Corporativo como BU separada (DRE, financeiro, etc).
- Mudança no edge function `fetch-oxy-finance` (a fusão é feita no client, mantendo a fonte intacta).
