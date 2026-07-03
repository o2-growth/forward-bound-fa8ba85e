Diagnóstico encontrado:

1. Existem 3 cards de Monetização com movimento em julho:
   - 1383090406 — FromTherm — Concluído em 01/07 e 02/07 — valor real histórico: R$ 10.000,00
   - 1391208172 — Samba Decor — Concluído em 02/07 — valor real histórico: R$ 7.000,00
   - 1393377615 — Dom Duan Supermercado — entrou em Proposta enviada / Follow Up, Aprovado e Jurídico em 02/07 — valor não preenchido no banco

2. Motivo de continuar zerado/não mostrando corretamente:
   - A busca atual pega só movimentações cuja `Entrada` está dentro do mês.
   - Para FromTherm e Samba Decor, os valores `moeda` estavam preenchidos nas movimentações antigas de junho, mas nas linhas de julho vieram nulos.
   - O fallback para `moeda` foi aplicado só na linha selecionada de julho; como essa linha está nula, continua R$ 0.
   - Para Proposta, a lógica usa `Fase Atual`; o Dom Duan está com `Fase Atual = Jurídico`, então deixa de contar como proposta mesmo tendo passado por `Proposta enviada / Follow Up` em julho.

Solução definitiva:

1. Alterar `useMonetizacaoAnalytics` para buscar em duas etapas:
   - Primeiro: movimentações do período, para saber quais cards tiveram evento no mês.
   - Segundo: histórico completo desses IDs via action existente `query_card_history`, para recuperar valores preenchidos em qualquer movimentação anterior.

2. Criar uma hidratação de valor por card:
   - Somar `valor_*` se existirem em algum ponto do histórico.
   - Se não houver `valor_*`, usar o maior/último `moeda` não nulo do histórico.
   - Aplicar esse valor hidratado nas linhas do mês atual.
   - Resultado esperado: FromTherm = R$ 10.000, Samba Decor = R$ 7.000, Dom Duan = R$ 0 enquanto não tiver valor preenchido.

3. Corrigir a lógica de Proposta/Venda da Monetização:
   - Para contar entrada no funil, usar a coluna `Fase` do movimento dentro do período, não apenas `Fase Atual`.
   - `Proposta` conta quando `Fase` for `Proposta enviada / Follow Up` ou `Proposta em Elaboração` dentro do mês.
   - `Venda` conta quando `Fase` for `Concluído` dentro do mês.
   - Deduplicar por card + indicador + mês, para evitar contar FromTherm duas vezes por ter reentrada em Concluído.

4. Ajustar o drill-down e indicadores monetários:
   - Os itens retornados por `getDetailItemsForIndicator('venda')` e `('proposta')` passam a usar os eventos do período com valor hidratado.
   - `faturamento`, `pontual`, `ticket médio`, detalhes e origem Monetização passam a refletir o mesmo valor.

5. Validar após implementar:
   - Julho / mês atual deve mostrar 3 cards em Monetização no conjunto do período.
   - Venda deve incluir FromTherm e Samba Decor com R$ 17.000 total.
   - Proposta deve incluir Dom Duan no drill-down, mesmo estando atualmente em Jurídico.
   - Dom Duan permanece com valor R$ 0 até o valor ser preenchido na base.