## Causa raiz definitiva

Existem duas fontes possíveis para as metas do funil (MQL, Leads, RM, RR, Proposta, Venda) no dashboard de Indicadores:

1. **`funnel_metas` (banco)** — snapshot oficial, gravado quando o usuário salva ou trava o mês.
2. **`MediaMetasContext.funnelData`** — cálculo ao vivo do Plan Growth, derivado do MRR Base atualizado diariamente pelo Oxy Finance + funis reversos + ticket médio.

A regra de negócio correta já existe no projeto e é **`is_locked`**:

- `is_locked = true` → mês fechado, valor congelado, **DB é a verdade**.
- `is_locked = false` → mês aberto, valor é dinâmico, **Plan Growth ao vivo é a verdade**.

A correção anterior priorizou o DB em todos os casos, fazendo Maio (não-locked) mostrar 398 (stale) em vez de 537 (Plan Growth atual). Além disso, a oscilação acontecia porque, dependendo de qual fonte carregava primeiro, o componente mostrava 398 ou 537.

## Solução definitiva

Adotar uma única função `getMetaFromSource(bu, mês, indicador)` com a seguinte regra, usada em **todos** os pontos que leem meta de funil:

```text
se (mês está em funnel_metas DB e is_locked = true)
    retorna valor do DB              // mês fechado, congelado
senão se (funnelData carregado para a BU)
    retorna valor do Plan Growth     // ao vivo, fonte da verdade para meses abertos
senão
    retorna null  → renderiza skeleton (nunca 0, nunca stale)
```

Isso elimina a oscilação porque:
- meses fechados nunca dependem do contexto async,
- meses abertos sempre esperam o `funnelData` antes de renderizar (skeleton breve, mas estável),
- o DB stale (398) nunca mais sobrescreve o cálculo correto (537).

## Arquivos alterados

### 1. `src/components/planning/IndicatorsTab.tsx`
- Substituir `getDbFunnelValue` por `getLockedDbFunnelValue` que **só** retorna valor do DB quando `is_locked = true`.
- Em `calcularMetaDoPeriodo` e `getMonthlyMetasFromFunnel`: usar Plan Growth (`funnelItems`) como fonte primária; DB só vence se o mês estiver locked.
- Quando `funnelData` está `null` (ainda carregando) e o mês não é locked, propagar `null`/skeleton para os componentes de gauge em vez de cair em 0.

### 2. `src/components/planning/LeadsMqlsStackedChart.tsx`
- Mesma regra: Plan Growth ao vivo como fonte; DB só para meses locked.
- Enquanto `funnelData` não chega para uma BU não-locked, exibir estado de carregamento no card (já existe pattern de skeleton no projeto) em vez de calcular com 0.

### 3. `src/hooks/useConsolidatedMetas.ts`
- Aplicar a mesma hierarquia para a meta monetária (`faturamento_vender`):
  - mês locked → `funnel_metas.faturamento_vender` do DB,
  - mês aberto → cálculo ao vivo do Plan Growth,
  - nada disponível ainda → não renderizar valor (skeleton).

## O que **não** muda

- `usePlanGrowthData` continua sendo a fonte do cálculo ao vivo (não mexer na lógica reversa).
- Nenhuma migration. Nenhum INSERT/UPDATE/DELETE. O 398 stale no DB simplesmente para de ser lido para Maio (mês aberto). Quando o usuário travar Maio (`is_locked=true`), o sistema gravará o valor atual e passará a usar o DB.
- Aba Plan Growth, O2 TAX, Expansão, Oxy Hacker — sem mudanças.

## Validação

Indicadores → Comercial → Modelo Atual → Mai/2026:
- Recarregar 5×: meta de MQL deve mostrar **537** consistentemente (valor do Plan Growth).
- Travar Maio em Plan Growth → recarregar: meta deve passar a vir do DB e ficar fixa.
- Mês passado já travado (ex.: Jan/Fev): valor permanece o do DB, intocado.
