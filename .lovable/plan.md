## Adicionar breakdown de SDR por semana

Atualmente o "Comparativo Semanal" mostra a tabela "Por SDR" apenas com totais do período inteiro. Vou adicionar uma visão semanal: para cada semana (S1, S2, S3...), exibir uma tabela com SDR × indicadores (RM, RR, Prop, Venda).

### Mudanças em `src/components/planning/indicators/WeeklyComparison.tsx`

1. **Novo componente `SdrBreakdownWeekly`**
   - Recebe a lista de `weeks`, `itemsByIndicator` e `indicatorConfigs`.
   - Para cada semana, calcula o agrupamento `SDR → { rm, rr, proposta, venda }` usando a mesma função `getSdrName` (campo `sdr` com fallback `responsible`, "Sem SDR" para vazios).
   - Renderiza uma tabela compacta por semana, com cabeçalho "S1 (1-7)" etc., colunas dos indicadores presentes, linhas por SDR ordenadas pela primeira coluna (RM) e linha de Total.
   - Semanas sem dados mostram "Sem dados" discreto em vez de tabela vazia.

2. **Layout**
   - Manter a tabela atual `SdrBreakdown` (período completo) como resumo no topo.
   - Logo abaixo, uma seção "Por SDR — semana a semana" com as tabelas semanais empilhadas verticalmente (cada semana como um bloco com borda).
   - Para muitas semanas (4–5), as tabelas ficam compactas (padding reduzido, fontes xs).

3. **Reuso**
   - Extrair a lógica de agregação SDR×indicadores num helper `aggregateSdrCounts(items, columns, startTime, endTime)` para ser usado tanto pelo total quanto por cada semana.
   - Sem mudanças nos charts nem na lógica de filtros existentes.

Nenhum outro arquivo será alterado.
