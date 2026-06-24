Plano para corrigir o modal vazio dos acelerômetros no Dash Comercial:

1. Ajustar os itens gerados pelos hooks de metas
   - Em `useExpansaoMetas` e `useOxyHackerMetas`, preencher `company`, `responsible`, `closer` e `sdr` com fallback seguro.
   - Alinhar `value`, `pontual` e `total` para que vendas de Franquia/Oxy tenham o mesmo valor usado nos acelerômetros.
   - Remover o log de debug temporário que foi adicionado em `IndicatorsTab`.

2. Corrigir a origem dos dados no clique dos cards monetários
   - Em `handleMonetaryCardClick`, montar a lista de vendas a partir dos mesmos detalhes usados pelos gauges quando Franquia ou Oxy Hacker estiverem selecionados sem filtros.
   - Para `Fat Incremento` e `Pontual`, usar o valor realizado do acelerômetro como total de referência, evitando que o modal calcule zero por depender de campos antigos.

3. Corrigir o clique do acelerômetro de `Vendas`
   - Garantir que `getItemsForIndicator('venda')` devolva registros completos vindos de `getExpansaoDetailItems('venda', startDate, endDate)` para Franquia e de `getOxyHackerDetailItems(...)` para Oxy Hacker.
   - Manter a base analytics apenas quando filtros de pessoa/origem estiverem ativos, porque ela contém os campos de filtro.

4. Validar o caso reportado
   - Dash Comercial com BU Franquia e período completo.
   - Clicar em `Vendas`, `Fat Incremento` e `Pontual` deve abrir o modal com registros, empresas e valores coerentes com os acelerômetros.