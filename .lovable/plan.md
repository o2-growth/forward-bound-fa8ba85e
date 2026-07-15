## Diagnóstico

Hoje a classificação de origem funciona assim:

1. `useMonetizacaoAnalytics.toDetailItem` já injeta `tipoOrigem: MONETIZACAO_ORIGEM_SENTINEL` (`'__monetizacao__'`) e `bu: 'Monetização'` em cada item.
2. `classifyLeadSource` (leadSource.ts, regra 0) devolve `'monetizacao'` quando `tipoOrigem` bate com o sentinel.
3. Em `IndicatorsTab.tsx`, o filtro de origem chama `classifyLeadSource` passando `card.tipoOrigem`.

Onde o esquema quebra (e por isso cards de Monetização aparecem como "Sem origem" no filtro da aba Comercial):

- **A.** Nos blocos de MQL/RM/RR/Proposta/Venda a soma parte dos `allCards` dos hooks de BU (Modelo Atual, Franquia, Oxy Hacker, Outbound). Alguns cards desses pipes são, na prática, upsell/cross-sell/troca (ou foram duplicados no Pipefy também no pipe Monetização). Como esses cards **não** passam pelo `toDetailItem` da Monetização, chegam sem o sentinel e, se o restante dos campos de origem estiver vazio, o classificador cai no fallback `sem_origem`.
- **B.** `matchesOrigemFilter` só olha para 5 campos (`tipoOrigem`, `origemLead`, `fonte`, `campanha`, `sdr`, `produto`) e ignora um sinal forte que já existe no item: `bu === 'Monetização'`. Em qualquer caminho onde o item já veio marcado com `bu` mas o `tipoOrigem` foi perdido/reescrito, o classificador não tem como decidir.
- **C.** Nos contadores da Monetização (linhas 1461 e 1894), o gate `selectedOrigens.includes('monetizacao')` protege proposta/venda, **mas** MQL/RM/RR não têm gate equivalente — a Monetização não contribui MQL/RM/RR, então cards de origem "monetização" que aparecem nesses degraus vieram da leitura direta dos pipes de BU (caminho A) e são invisíveis para a regra do sentinel.

## Correção

**1. Blindar `classifyLeadSource` contra a perda do sentinel.**
Aceitar também `bu` como entrada e, se `norm(bu) === 'monetizacao'`, retornar `'monetizacao'` na regra 0. Isso torna a classificação robusta a qualquer caminho de agregação que preserve o `bu` mas perca o `tipoOrigem`.

Arquivo: `src/lib/leadSource.ts`
- Adicionar `bu?: string | null` a `ClassifyInput`.
- Na regra 0, além do sentinel, checar `norm(c.bu) === 'monetizacao'`.

**2. Propagar `bu` em toda chamada de `classifyLeadSource`.**
Nos 3 pontos que classificam cards/items em `IndicatorsTab.tsx` (`matchesOrigemFilter` linha 987, `classifyItem` linha 2065) e em `ClickableFunnelChart.tsx` (linha 67) passar `bu: card.bu ?? card.buLabel ?? undefined`.

**3. Rotular Monetização já no card cru.**
Em `useMonetizacaoAnalytics`, além do `toDetailItem`, marcar cada `MonetizacaoCard` com `tipoOrigem: MONETIZACAO_ORIGEM_SENTINEL` e `bu: 'Monetização'` no próprio objeto retornado (não só no DetailItem). Assim, se algum consumidor iterar `cards` diretamente, o sinal continua presente.

**4. Fechar a porta A (detecção heurística nos pipes de BU).**
Em `matchesOrigemFilter`, antes de chamar `classifyLeadSource`, se `card.tipoMovimentacao` / `card.tipo` / título contiver `upsell|cross[- ]?sell|troca de produto|downsell` **e** o card não tiver origem preenchida, tratá-lo como `'monetizacao'`. Isso captura os cards do Modelo Atual que na verdade são movimentos de base e evita que virem "Sem origem" por falta de preenchimento.

## Impacto

- Filtro "Sem origem" deixa de listar cards de Monetização em qualquer BU.
- Filtro "Monetização" passa a listá-los de forma consistente vindo tanto do pipe dedicado quanto de duplicações nos pipes de BU.
- Nenhuma métrica monetária muda — só a rotulagem de origem.
- Risco: se um card de Modelo Atual tiver "Upsell" no título por coincidência (raro), será rotulado como Monetização. Mitigável restringindo o gatilho a quando `tipoOrigem/origem/fonte/campanha` estão todos vazios (mesma pré-condição do fallback `sem_origem` atual).

## Arquivos alterados

- `src/lib/leadSource.ts` — nova entrada `bu`, nova checagem na regra 0, gatilho heurístico opcional (passo 4).
- `src/hooks/useMonetizacaoAnalytics.ts` — anexar `tipoOrigem`/`bu` ao card cru.
- `src/components/planning/IndicatorsTab.tsx` — passar `bu` nas duas chamadas de `classifyLeadSource`.
- `src/components/planning/ClickableFunnelChart.tsx` — passar `bu` em `matchCardOrigem`.

Confirma que posso seguir com essa correção?
