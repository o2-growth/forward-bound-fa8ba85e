## Problema

Ao filtrar Modelo Atual + Closer Thiago, os realizados são do Thiago (21 MQL, 34 RM, 23 RR, 19 Prop, 7 Venda), mas as **metas continuam sendo as da BU inteira** (487/195/156/125/31). Impossível ver o % individual dele.

Você confirmou que a meta do Thiago está cadastrada na aba **Metas Closer (Indicadores)** → tabela `closer_absolute_metas` (colunas `rm_meta`, `rr_meta`, `prop_meta`, `venda_meta`, `faturamento_meta` por closer/mês/ano). Hoje o acelerômetro ignora essa tabela e usa só `closer_metas` (%), que provavelmente está com 100% legado ou zerado para Thiago.

## Plano

### 1. Passar a usar `closer_absolute_metas` no acelerômetro
Em `src/components/planning/IndicatorsTab.tsx`:

- Importar `useCloserAbsoluteMetas(currentYear)` no topo do componente.
- Criar helper `getCloserAbsoluteMetaForPeriod(indicatorKey, start, end, closers)` que:
  - Só age quando `indicatorKey ∈ {rm, rr, proposta, venda}` (não há `mql_meta` na tabela).
  - Para cada mês do período, soma as metas absolutas dos closers selecionados (match por `firstNameKey`), rateando por overlap de dias no mês (mesma fórmula já usada em `calcularMetaDoPeriodo`).
  - Retorna `{ value, hasData }`. `hasData=true` se algum closer selecionado tem meta > 0 em algum mês do período.

- Em `calcularMetaDoPeriodo` (linhas 885-947), **antes** do loop atual: se `closerFilter?.length > 0` e o indicador é `rm|rr|proposta|venda`, tentar `getCloserAbsoluteMetaForPeriod`. Se `hasData` → retornar esse valor e pular todo o fluxo antigo. Senão, cair no fluxo atual (`closer_metas` %).

- Mesma lógica em `getMonthlyMetasFromFunnel` (linhas 949-995), mês a mês, para manter gráficos alinhados.

### 2. MQL
`closer_absolute_metas` não tem `mql_meta`. Como MQL vem de SDR e não de closer, manter o comportamento atual (fluxo `closer_metas` %) — o usuário verá a meta rateada por % se houver, ou 0 se não houver.

### 3. Escopo mínimo
- **Nenhuma mudança em schema.**
- **Não mexer** em faturamento/monetários por ora (a queixa é dos 5 gauges de quantidade).
- **Não mexer** no fluxo sem closer selecionado.

### Detalhes técnicos
- Arquivo único: `src/components/planning/IndicatorsTab.tsx`.
- Helper novo isolado + 2 pontos de integração (`calcularMetaDoPeriodo`, `getMonthlyMetasFromFunnel`).
- Remover os `console.log` de debug `[FUNIL …]` / `[ACEL …]` adicionados no turno anterior, já que a divergência do funil ficou clara (proposta bateu, o resto é ruído numérico pequeno de dedup — se você quiser, tratamos depois em outra etapa).

### Validação
Após aplicar: selecionar Modelo Atual + Thiago no mês de Jun/2026 deve trazer meta RM/RR/Prop/Venda batendo com o que está cadastrado na aba Metas Closer para Thiago naquele mês (rateada se o período for parcial).
