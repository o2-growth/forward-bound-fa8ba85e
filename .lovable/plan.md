

## Investigação: 8 cards faltando no indicador de Reunião Realizada

### Diagnóstico do problema

Após analisar o código, identifiquei a **causa raiz provável**: a ação de diagnóstico `rr_sdr_diagnosis` só consulta a tabela `pipefy_moviment_cfos` (pipeline principal Modelo Atual). Porém, esses 8 cards pertencem à **pipeline de Expansão** (`pipefy_cards_movements_expansao`), que tem uma tabela separada.

Os cards fornecidos são:
1. Kalléu Barbosa — `1309926926`
2. Rafael B Rodrigues — `1298234954`
3. Everton Lima — `1297811297`
4. Ely Guimarães — `1298042880`
5. Rafael Meireles Aguiar — `1309904589`
6. Vera — `1298234933`
7. Ruan Couto — `1297858136`
8. Nathan — `1278224326`

### O que vou fazer

**Passo 1 — Consultar o banco externo** diretamente via a edge function `query-external-db` usando a ação `query_card_history` na tabela `pipefy_cards_movements_expansao` com os 8 card IDs. Isso retorna **todo o histórico de movimentações** de cada card.

**Passo 2 — Analisar** para cada card:
- Se existe uma linha com `Fase = "Reunião Realizada"`
- Qual a data de `Entrada` nessa fase
- Se a data cai dentro do período selecionado no dashboard (Março/2026)
- Qual o valor de `Produtos` (Franquia vs Oxy Hacker)
- Qual o `SDR responsável` e `Closer responsável`

**Passo 3 — Reportar** a causa exata de cada card não aparecer (sync ausente, data fora do período, produto errado, SDR diferente, etc.)

### Alteração de código

Nenhuma alteração de código — esta é uma investigação de dados que executarei via script consultando o banco diretamente com `psql` ou invocando a edge function.

### Execução

Vou rodar um script que:
1. Invoca `query-external-db` com `action: query_card_history` + `table: pipefy_cards_movements_expansao` + os 8 cardIds
2. Analisa o resultado e gera um relatório detalhado

