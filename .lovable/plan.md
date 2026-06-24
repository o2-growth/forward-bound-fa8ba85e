## Plano

1. Ajustar os detalhes gerados pelos hooks de metas de Franquia e Oxy Hacker para preencher os campos esperados pelo modal:
   - `company`, além de `name`
   - `value` como total real do contrato
   - `pontual` como o mesmo valor pontual real usado no gauge
   - `responsible/closer/sdr` com fallback vazio, para não quebrar rankings/colunas

2. Corrigir a lógica dos acelerômetros monetários em `IndicatorsTab.tsx`:
   - para `Faturamento` e `Pontual`, usar a mesma soma exibida no card quando a BU selecionada for Franquia/Oxy
   - evitar depender de `item.value` zerado quando o dado vem da base de metas

3. Corrigir o clique no acelerômetro de `Vendas`:
   - garantir que o modal receba os itens vindos de `getExpansaoDetailItems('venda', startDate, endDate)` / `getOxyHackerDetailItems(...)`
   - manter filtros de closer/SDR/origem usando a base antiga apenas quando eles estiverem ativos

4. Validar no preview o caso reportado:
   - Dash Comercial → BU Franquia → período 01/01/2026 a 24/06/2026
   - card mostra 14 vendas e R$ 1,4M
   - clique em `Vendas`, `Fat Incremento` e `Pontual` deve abrir modal com registros e totais coerentes.