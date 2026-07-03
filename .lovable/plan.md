Situação no banco agora (última sync 02/07 20:34 UTC):

- **FromTherm (1383090406)** — `moeda = R$ 10.000` apenas em linhas de junho; linhas de julho estão nulas. Todos `valor_*` nulos.
- **Samba Decor (1391208172)** — `moeda = R$ 7.000` apenas em linhas de junho; linha de 02/07 nula. Todos `valor_*` nulos.
- **Dom Duan Supermercado (1393377615)** — `moeda` nulo em todo histórico. Todos `valor_*` nulos.

Os valores novos que você preencheu no Pipefy ainda não vieram na sincronização do banco. A correção precisa funcionar tanto agora (aproveitando o histórico) quanto quando o sync trouxer os novos valores.

Solução definitiva no `useMonetizacaoAnalytics`:

1. **Busca em 2 etapas**
   - Etapa 1: `query_period` no mês atual para descobrir quais IDs tiveram movimento.
   - Etapa 2: `query_card_history` com esses IDs para trazer TODAS as linhas históricas.

2. **Hidratação de valor por card** (usando o histórico inteiro)
   - Somar cada `valor_*` pegando o maior valor observado em qualquer linha (não nulo).
   - Se `soma(valor_*) > 0` → usa a soma como `valorTotal` e classifica em MRR / Setup / Pontual conforme o campo.
   - Senão → usa o maior `moeda` observado como `valorTotal` (classificado como Pontual).
   - Resultado esperado hoje: FromTherm R$ 10.000, Samba Decor R$ 7.000, Dom Duan R$ 0.
   - Quando o Pipefy sincronizar os novos `valor_*` preenchidos, eles substituem automaticamente.

3. **Contagem Proposta / Venda pelo evento do mês** (não pela `Fase Atual`)
   - `venda`: card teve alguma movimentação com `Fase = "Concluído"` dentro do período.
   - `proposta`: card teve alguma movimentação com `Fase ∈ {"Proposta enviada / Follow Up", "Proposta em Elaboração"}` dentro do período.
   - Deduplicar por `card + indicador + mês` para evitar dupla contagem (FromTherm reentrou em Concluído 2x).
   - Resultado esperado julho: Venda = FromTherm + Samba (2 cards, R$ 17.000). Proposta = Dom Duan (1 card, R$ 0).

4. **Propagação nos consumidores**
   - `getDetailItemsForIndicator('venda' | 'proposta')` retorna os cards do período com valor hidratado.
   - `IndicatorsTab` (`faturamento`, `mrr`, `setup`, `pontual`, ticket médio, origem Monetização) e o agregador de faturamento passam a refletir o mesmo valor sem mudanças adicionais.

5. **Validação após implementar**
   - Aba Indicadores → filtro julho: card Monetização mostra 3 cards no mês, Venda R$ 17.000 (FromTherm + Samba), Proposta com Dom Duan aparecendo no drill-down.
   - Assim que o Pipefy sincronizar os novos valores nos campos discriminativos, o dashboard reflete sem novo deploy.