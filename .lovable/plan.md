## Ajuste: Pontual como fee no squad de Pedrolo e Mariana

Para os squads de **Eduardo Pedrolo** e **Mariana** (que seguem a regra de "carteira do mês passado"), o custo do squad passará a usar o **Pontual** do mês selecionado como fee, em vez do fee mensal recorrente do DRE.

### Mudanças
- `src/hooks/useSquadCostFromDre.ts`: adicionar busca/agregação do valor **Pontual** por pessoa no DRE Oxy (mesmas regras de matching já usadas para o fee).
- `src/components/planning/jornada/CfoView.tsx`: para os CFOs Pedrolo e Mariana, substituir o `fee` exibido (cards-resumo + modal "Composição do Squad") pelo `pontual` do mês. Demais CFOs continuam com a lógica atual.

### Detalhes técnicos
- Reaproveitar o pipeline de alias/fuzzy match já existente — só muda a coluna agregada (Pontual em vez de Fee/Benefícios).
- Manter fallback do mês anterior caso o Pontual do mês corrente esteja vazio, idêntico ao já feito para fee.
- Badge "(MM/YYYY)" continua aparecendo quando o valor vier de fallback.