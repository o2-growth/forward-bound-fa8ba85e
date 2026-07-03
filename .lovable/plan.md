Plano para corrigir somente o funil de Monetização:

1. Ajustar a extração de valores em `src/hooks/useMonetizacaoAnalytics.ts` para normalizar campos duplicados do Pipefy:
   - Tratar `valor_cfoaas` e `valor_cfoaas_1` como o mesmo tipo de valor, evitando perda/duplicidade.
   - Fazer o mesmo para `valor_setup`, `valor_bpo`, `valor_coordenador_financeiro`, `valor_assessoria_mrr`, `valor_oxy`, `valor_diagn_stico`, `valor_turnaround`, `valor_valuation` e suas versões `_1`.

2. Garantir que os cards abertos trazidos pela regra nova usem todo o histórico do card para calcular valor:
   - Não depender apenas da linha atual aberta.
   - Pegar o maior valor válido por campo base dentro do histórico completo do card.

3. Melhorar o parse numérico para suportar valores que cheguem como número, string decimal ou string formatada em reais, sem alterar outras BUs.

4. Manter a regra de período intacta:
   - `Concluído` continua dependendo do filtro de tempo.
   - As demais fases continuam aparecendo independentemente do período.

5. Validar chamando a função de backend para os cards abertos e conferindo que cards como os novos de Monetização passam a somar valores quando houver valor em campos `valor_*`/`*_1` no histórico.