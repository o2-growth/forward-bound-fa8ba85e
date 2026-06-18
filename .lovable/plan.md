## Indicadores faltantes na aba Pessoas

Comparando o que já está em `PessoasTab.tsx` com a especificação (imagens 3.1 e 3.2), faltam **3 indicadores** e **1 subgrupo**. Todo o resto já está implementado.

### O que falta

**3.1 Headcount e movimentação**
1. **Headcount por Área** (hoje só temos por Time e Cargo)
2. **Turnover por Área** (hoje só temos por Time)

**3.2 Custo de pessoal**
3. **Custo de turnover** = soma de lançamentos categorizados como "Rescisão" no período (Oxy DRE)

### Implementação

**`src/hooks/useHrData.ts`**
- Adicionar campo opcional `Área` (string) em `PessoaRow`.
- Novos retornos no objeto de métricas:
  - `headcountByArea: HeadcountByGroup[]`
  - `headcountByAreaTime: { area: string; time: string; count: number }[]` (agrupamento composto Área × Time, para o card "Headcount por área e time")
  - `turnoverByArea: { group: string; desligados: number; headcount: number; pct: number }[]`
- Mesma lógica de `groupCount` e `turnoverByTime`, trocando a chave para `Área`.
- Fallback: se a coluna `Área` vier vazia/inexistente no Pipefy, usar `timeToBu(Time)` como aproximação para não quebrar a UI.

**`src/hooks/usePersonnelCostByBu.ts`**
- Expor `custoTurnover: number` e `custoTurnoverSerie: { period; value }[]` a partir das categorias cujo label casa com `/rescis/i` (já filtradas hoje em `PERSONNEL_RE`, basta segregar).
- Manter o total atual (Rescisão continua contando dentro do `total` agregado, como já faz hoje).

**`src/components/planning/PessoasTab.tsx`**
- Em **3.1**, adicionar um 4º card ao grid de breakdown: **"Headcount por Área"** (mesmo visual do "Headcount por Time"), e trocar o card atual **"Turnover por Time"** por uma versão com toggle Time / Área (ou empilhar Área como card adicional, decidido visualmente — defaultmente Área aparece e Time vira segundo).
- Em **3.2**, adicionar um 5º KPI ao grid (passando de `md:grid-cols-4` para `md:grid-cols-5`): **"Custo de turnover"** mostrando `formatCurrencyCompact(pc.custoTurnover)` e como subtitle a quantidade de desligados no período (`hr.desligadosNoPeriodo`).
- Tom do KPI: `negative` se > 0 e representar > 5% do custo total, senão `warning`/`default`.

### Fora do escopo
- Periodicidade "Diária" para Headcount (hoje é snapshot na carga da página — suficiente).
- Indicadores da Fase 2 (que segundo o PDF "dependem de ajuste de processo").
- Nenhum refactor do drill-down já existente.
