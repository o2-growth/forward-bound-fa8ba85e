# Confirmar Closer do GSC como Thiago Santana na aba Vendas

## Diagnóstico
- Banco (mirror externo, `pipefy_moviment_outbound`, card 1341215587): `vendedor_respons_vel = "Thiago Santana"` em todas as 7 linhas — a atualização anterior persistiu.
- Print do usuário ainda mostra "Matheus Staruck dos Reis" no Closer — provavelmente cache do React Query (a query de outbound é cacheada por `queryKey: ["outbound-analytics", startDate, endDate]`).
- `useOutboundAnalytics.parseOutboundRow` já usa `vendedor_respons_vel` como `closer`, então após invalidar a cache o campo passa a exibir Thiago.

## Passos
1. Rodar Playwright abrindo o dashboard autenticado, ir na aba Indicadores período 01–06/07, abrir o drill de "Venda" e capturar a linha do GSC. Se ainda vier "Matheus", forçar reload (Ctrl+Shift+R equivalente: `page.reload({ waitUntil: "networkidle" })` + limpar `localStorage['REACT_QUERY_OFFLINE_CACHE']` se existir).
2. Confirmar visualmente que Closer do GSC = "Thiago Santana" e SDR permanece "Matheus Staruck dos Reis".
3. Se, mesmo após reload, aparecer Matheus (isso indicaria fallback `closer || responsible` em algum formatter), localizar o formatter da coluna Closer no DetailSheet e ajustar para não sobrescrever quando `closer` estiver preenchido — investigar apenas se o reload não resolver.

## Nada a mudar no backend
O update já está feito e verificado no mirror. Sem migrações, sem novos deploys.
