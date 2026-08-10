# Corrigir canal da Invenzi: Indicação → Evento

## O que está acontecendo

No espelho do Pipefy, o card da Invenzi (ID 1409285792, Ganho em 07/07) tem:
- "Tipo de Origem do lead": vazio
- "Origem do lead": `GE ` (sigla solta, com espaço)

Como a sigla não bate com nenhum token de evento, o classificador cai na regra
"origem é uma palavra solta → Indicação". Por isso todo o funil desse card
(Lead, MQL, RM, RR, Proposta e Venda) aparece como Indicação.

## Correção

Em `src/lib/leadSource.ts`, adicionar `GE` como sigla de evento G4:

- Nova checagem, junto do bloco de EVENTO (que já roda antes de Indicação):
  se o campo Origem do lead, depois de normalizado e sem espaços, for
  exatamente `ge` (ou `g.e.`), retorna `evento`.
- Comparação por token exato — nada de "contém GE" — para não afetar palavras
  como "Gestão", "Google", "Agência" nem qualquer outro card.
- A mesma regra vale no bloco antecipado de Franquia/Oxy Hacker, para manter
  consistência caso um card desses produtos venha com `GE`.

Como a classificação é a mesma função usada em todas as etapas do funil, o
card da Invenzi passa a contar como Evento em Leads, MQL, RM, RR, Proposta e
Venda — sem mexer na movimentação nem nos valores do card.

## Escopo e segurança

- Nenhuma outra regra de canal é alterada.
- Nenhum outro card muda de canal, a não ser que tenha exatamente `GE` em
  Origem do lead (mesmo caso, mesma intenção).
- Sem alteração no banco, no Pipefy ou nas métricas de valores.

## Verificação

Após a mudança, conferir em Indicadores › Comercial que a Invenzi aparece com
canal **Evento** nas vendas de julho e nos demais estágios do funil, e que os
totais por canal continuam batendo (apenas 1 card migra de Indicação p/ Evento).
