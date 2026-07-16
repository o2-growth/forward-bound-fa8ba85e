# Diagnóstico — Filtro Closer Bruna x MQLs Franquia+Oxy Hacker (01–16/Jul)

## Resumo

- **Sem filtro de closer (Franquia + Oxy Hacker):** 20 MQLs — todos os cards que entraram nas fases `Lead` ou `MQL` no período e passam no threshold de investimento ≥ R$ 15k.
- **Com filtro Closer = Bruna:** 7 MQLs — apenas cards cujo campo `Closer responsável` está preenchido com "Bruna" no momento em que a UI filtra.

Ou seja: **os outros 13 MQLs existem, contam para a BU, mas não têm `Closer responsável` = Bruna gravado no card** (nem preenchimento equivalente no histórico).

## Por que isso acontece

1. Em Franquia e Oxy Hacker, `Closer responsável` é preenchido no Pipefy tipicamente a partir de fases mais avançadas (Reunião Agendada / Realizada / Proposta). Cards que ainda estão em `Lead` ou `MQL` normalmente **não têm closer** — o campo fica vazio.
2. O hook `useExpansaoAnalytics.ts` tenta corrigir isso com o `enrichCardWithEffectiveOwners` (linhas ~498–528): ele varre `fullHistory` do próprio card e adota o último `Closer responsável` não-vazio encontrado em qualquer movimento daquele card.
3. Isso só funciona se o card **já tenha avançado** para uma fase onde algum closer foi preenchido no passado. Para os MQLs recém-criados em Jul (ainda em Lead/MQL), o histórico não tem nenhum movimento com closer → `card.closer` permanece `null` após enrichment.
4. Em `IndicatorsTab.tsx` (linhas 1557–1558 Franquia, 1639–1640 Oxy Hacker), quando `hasPeopleFilter` está ativo, a série do gráfico usa `buildQtyArrayFromFilteredCards`, que filtra por `matchesCloserFilter(card.closer)` (linha 1488). Sem closer no card, o MQL é excluído.
5. O rateio 100% Bruna em Jul definido em `closer_metas` afeta **metas**, não a atribuição de cards realizados. A atribuição de card exige o nome no campo real do Pipefy (ou no histórico do card).

Resultado: 20 (real da BU) − 13 (sem closer preenchido) = **7 (com Bruna explícita)**.

## Como confirmar rapidamente (opcional)

Abrir a lista de MQLs sem filtro de closer no período e ordenar por "Closer": os 13 excedentes aparecerão com Closer vazio. Ao aplicar Closer=Bruna, somem exatamente esses 13.

## Opções de correção (a decidir com você)

Todas mantêm a lógica atual para outras BUs; só muda o comportamento do filtro Closer em **Franquia e Oxy Hacker**:

**Opção A — Fallback por rateio da BU (recomendada):**
Quando o card tem `closer` vazio E o filtro Closer está ativo, considerar o card como pertencendo aos closers com % > 0 em `closer_metas` para aquela BU/mês. Em Jul, Bruna = 100% em ambas → todos os 20 MQLs entram no filtro dela. Em meses com rateio dividido (ex.: 50/50), o card entra para ambos os closers do rateio.

**Opção B — Fallback fixo "Bruna em Jul":**
Hardcode temporário: se BU ∈ {Franquia, Oxy Hacker} E mês = Jul/2026 E `card.closer` vazio → tratar como Bruna. Simples, mas específico e não escala.

**Opção C — Não filtrar MQL por closer em Franquia/Oxy Hacker:**
Como MQL é fase pré-atribuição de closer, ignorar o filtro Closer especificamente para o indicador `mql` nessas BUs (mostrar sempre os 20). O filtro continua valendo para RM/RR/Proposta/Venda.

**Opção D — Não mexer, apenas documentar:**
Manter 7 como está, com um tooltip explicando que MQL não tem closer atribuído no Pipefy nessa fase.

## Detalhes técnicos

- Arquivo principal do MQL Expansão: `src/hooks/useExpansaoAnalytics.ts` (linhas 561–579 branch MQL; 498–528 enrichment).
- Aplicação do filtro no gráfico/gauges: `src/components/planning/IndicatorsTab.tsx` linhas 1481–1496 (`buildQtyArrayFromFilteredCards`) e 946–963 (`matchesCloserFilter`).
- Rateio de metas Bruna Jul/2026: `closer_metas` (100% Franquia + 100% Oxy Hacker) — não é usado hoje para atribuição de cards realizados.

Qual opção você quer que eu implemente? (Se escolher A, é a mais consistente com o rateio que você já configurou.)
