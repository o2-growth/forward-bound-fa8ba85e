## Diagnóstico

A aba G4 mostra ~7 leads porque `src/lib/g4Events.ts` classifica os cards de forma restritiva demais. Cards que claramente vieram do G4 no Pipefy caem em "nenhuma frente" e somem.

Pontos de correção identificados no código atual:

1. **`buildHaystack` ignora `paginaOrigem`** — só olha `origemLead / campanha / tipoOrigem / fonte`. Muita UTM de live G4 (ex.: `landing.g4educacao.com/live-...`) chega só na `paginaOrigem` e não é vista por `isCardLive` nem por `isCardEvento`.

2. **`isCardLive` exige `"live g4"` OU (`"g4"` **E** `"live"`) no mesmo haystack** — cards cujo sinal é apenas `campanha = "Live 20/05"` (sem a palavra "g4") ficam de fora. O correto é: se o card tem qualquer sinal G4 (incl. `paginaOrigem`) **e** bate a janela de captura de alguma live cadastrada, classificar como live.

3. **`isCardSeller` só reconhece `origemLead == "g4 seller"` ou `paginaOrigem` com `tools.g4business.com`** — mas o campo oficial ainda não foi configurado no Pipefy (nota exibida na UI). Falta reconhecer variações reais: `origemLead` contendo "seller", `campanha`/`tipoOrigem` com "g4 seller", ou `paginaOrigem` em subdomínios `*.g4business.com`.

4. **`isCardEvento` exige `"g4"` + token de evento** no mesmo haystack — cards com só `campanha = "G4 TOOLS CONNECT 06/05"` funcionam, mas cards com `origemLead = "G4"` e `campanha = "Talkshow SP"` (sem repetir "g4") não batem.

5. **Sem observabilidade**: hoje não dá pra saber quantos cards têm sinal G4 mas caíram em `null`. Precisamos de uma contagem "G4 detectado mas não classificado" para fechar o gap.

## Plano de correção

### 1. `src/lib/g4Events.ts` — afrouxar classificação sem perder disciplina

- `buildHaystack`: incluir `paginaOrigem` normalizado.
- Novo helper `hasG4Signal(card)`: retorna `true` se o haystack contém `"g4"` ou se `paginaOrigem` casa `/g4(educacao|business)\./` ou `/g4\.com/`.
- `isCardSeller`: manter os dois sinais atuais + `hasG4Signal(card) && haystack.includes("seller")`.
- `isCardLive`: passa a ser `hasG4Signal(card) && (haystack.includes("live") || dataEntrada cai na janela de qualquer G4_LIVES[i])`. Continua com prioridade abaixo de seller.
- `isCardEvento`: `hasG4Signal(card) && EVENT_TOKENS.some(...)` **ou** `matchEventoFromCard` retorna evento (garante que "G4 TOOLS CONNECT" bata mesmo sem token genérico).
- Manter prioridade rígida `seller > lives > eventos` em `classifyG4Card`.

### 2. `src/hooks/useG4Analytics.ts` — expor cards "G4 detectado sem frente"

- Após o passo 2 de classificação, gerar `unclassifiedG4Cards = cards com hasG4Signal(card) && classifyG4Card == null`.
- Adicionar ao retorno `G4Analytics`: `unclassifiedCount: number` e `unclassifiedCards: ModeloAtualCard[]`.
- Não alterar contadores existentes.

### 3. `src/pages/DebugG4LivesCheck.tsx` — estender para diagnóstico geral

- Adicionar seção topo "Cards G4 detectados sem frente" com tabela (id, título, origemLead, campanha, tipoOrigem, fonte, paginaOrigem, dataEntrada).
- Útil para o time confirmar se algum sinal ficou fora e, se sim, ampliar tokens/regras num passo seguinte.

### 4. Nota UI em `G4Tab.tsx`

- Trocar o texto do banner amarelo pela regra nova (haystack agora inclui `paginaOrigem`; live é reconhecida por sinal G4 + palavra live **ou** janela da live).
- Se `unclassifiedCount > 0`, mostrar pequeno badge cinza no header "N leads G4 sem frente (ver /debug/g4-lives-check)".

## Escopo fora deste plano

- Não vou reescrever `useModeloAtualAnalytics` nem tocar fluxo Pipefy/edge functions.
- Sem novas queries à API do Pipefy (respeitando "n gaste tanta api"). Toda a correção reusa os cards já carregados por `useModeloAtualAnalytics`.
- Custos de eventos (`cost: 0`) continuam como estão — assunto separado.

## Como validar

1. Abrir aba G4 → "Total Leads G4" deve saltar dos ~7 atuais para dezenas/centenas.
2. Abrir `/debug/g4-lives-check` (admin) → nova seção "sem frente" deve estar vazia ou perto disso; se ainda tiver muitos, ajustamos tokens numa segunda rodada com base na lista real.
