

## Investigação: 2 reuniões realizadas da Amanda faltando no dashboard (63 na planilha vs 61 no dash)

### Análise da planilha
A planilha tem **63 cards** onde Amanda é SDR e que tiveram movimento de "Reunião Realizada". As colunas são: Título, Fase Atual (onde o card está AGORA), Criador, Data de criação.

### Possíveis causas (3 hipóteses)

**Hipótese 1 — Campo "SDR responsável" diferente no Pipefy**
O dashboard filtra por `card.responsavel` que vem do campo `SDR responsável` do Pipefy. Se 2 cards têm um valor diferente nesse campo (ex: vazio, ou outro nome), o filtro por "Amanda" não os captura. A planilha pode ter sido exportada usando outro critério (ex: pelo campo "Criador").

**Hipótese 2 — Deduplicação mensal**
O dashboard usa a chave `cardId + fase + mês` para deduplicar. Se um card entrou em "Reunião Realizada" **duas vezes no mesmo mês**, só conta uma vez. A planilha pode estar mostrando as duas entradas.

**Hipótese 3 — Data de entrada fora do período**
O dashboard usa `dataEntrada` (data de entrada na fase RR) para verificar se cai no período selecionado. Se 2 cards têm a data de entrada em RR fora do período do filtro do dashboard, não aparecem.

### Plano de ação

Para identificar exatamente quais 2 cards estão faltando, vou:

1. **Consultar o banco externo** via `query-external-db` buscando todos os movimentos de "Reunião Realizada" e "1° Reunião Realizada - Apresentação" no período onde `SDR responsável` contém "Amanda"
2. **Cruzar com a planilha** — comparar os 63 títulos da planilha com os resultados do banco
3. **Identificar os 2 faltantes** — verificar se é por:
   - Campo SDR vazio/diferente
   - Deduplicação (mesmo card ID entrando 2x na mesma fase no mesmo mês)
   - Data fora do período
4. **Reportar** os cards específicos e a causa

### Alteração de código
Nenhuma alteração de código é necessária neste momento — primeiro preciso fazer a investigação de dados para confirmar a causa raiz. Se for um bug de lógica, proponho a correção depois.

