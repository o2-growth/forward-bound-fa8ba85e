## Contexto

Na aba **Configurações** do Plan Growth (Ticket Médio, CPMQL, CPV, conversões por estágio por BU), o mês de **Maio/2026** aparece bloqueado para edição. Hoje é 04/05/2026.

## Causa-raiz

Arquivo `src/hooks/useBUIndicatorsConfig.ts`, função `isMonthLocked` (linhas 32-38):

```ts
return monthIdx <= currentMonthIdx; // current month and past months are locked
```

A regra trava **mês atual + meses passados**. Como hoje é Maio (idx 4) e a regra usa `<=`, Maio fica travado. Esse lock afeta:
- A UI (campos desabilitados / mês escondido)
- O `saveMutation` que filtra os meses bloqueados antes do upsert em `bu_indicators_config`

> Importante: este lock é **independente** do `is_locked` em `funnel_metas` (que controla quantidades/monetário do funil). O lock de Configurações é puramente baseado na data atual.

## Mudança

Trocar a regra para travar apenas **meses passados**, mantendo o mês corrente editável:

```ts
return monthIdx < currentMonthIdx; // only past months are locked
```

Uma única linha alterada (linha 37 de `useBUIndicatorsConfig.ts`). Comentário acima também atualizado.

## Resultado esperado

- Maio passa a ser editável em **Plan Growth → Configurações** para todas as BUs.
- Jan–Abr continuam travados (passados).
- Jun–Dez continuam editáveis (futuros).
- A cada virada de mês, o mês recém-encerrado passa automaticamente a ficar travado.

## Fora do escopo

- `funnel_metas.is_locked` (lock de quantidades do Plan Growth principal — Abril já está locked lá, segue como está).
- Adicionar UI de toggle manual para travar/destravar.
