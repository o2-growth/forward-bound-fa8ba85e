## Objetivo
Corrigir 3 problemas pontuais nos indicadores comerciais sem alterar lógica de outros cards/meses.

## 1) Remover `teste_nao_atender@gmail.com` dos indicadores

**Causa (confirmada):** `isJunkCard` só detecta card de teste por `id`, `titulo`, `empresa`, `nome`, `contato` — não olha email. Nos hooks de analytics (Modelo Atual, O2 TAX, Oxy Hacker, Expansão) o campo `E-mail` da linha do Pipefy não é lido nem repassado ao filtro. Resultado: card com título "OXY" e email `teste_nao_atender@gmail.com` passa.

**Correção (`src/hooks/useModeloAtualMetas.ts`):**
- Adicionar `TEST_EMAIL_PATTERNS` (`/nao[_\s-]?atender/i`, `/^no[_\s-]?reply/i`, `/@example\./i`, `/@test\./i`, e-mails literais como `teste_nao_atender@gmail.com`, `demo@exemplo.com`).
- Estender `isJunkCard` para aceitar `email` e checar com as patterns.

**Correção nos hooks que constroem cards** — passar o email nos objetos entregues a `isJunkCard`:
- `useOxyHackerMetas.ts` (linha ~126)
- `useExpansaoAnalytics.ts` (4 sites já usam `isJunkCard`)
- `useO2TaxAnalytics.ts` (via `parseRawCard` → incluir `email`)
- `useModeloAtualAnalytics.ts` (parser de cards → incluir `email` no objeto passado a `isJunkCard`)

Impacto restrito a linhas cujo email casa nas patterns — nada muda para cards válidos.

## 2) GSC duplicado (Outbound + Inbound do mesmo card)

**Causa reportada pelo usuário:** o mesmo card GSC aparece duas vezes na lista de vendas — uma pela pipeline **Outbound** (`useOutboundAnalytics`) e outra pela pipeline **Modelo Atual/Oxy Hacker** (Inbound). Fontes distintas, mesmo card.

**Correção — dedup por `id` na camada de consumo consolidada (`IndicatorsTab.tsx` → drill-down de Vendas / Temperatura):**
- Ao juntar cards de múltiplas BUs para o modo Consolidado, deduplicar por `id` normalizado (stripe do prefixo de BU).
- Regra de preferência quando existe duplicata: **manter a ocorrência com data de venda mais recente**; empate → preferir a BU do card no Pipefy hoje (via `Fase Atual` / produto atual). Isso alinha com o padrão já usado em vendas dedup (`preferContratoAssinado`).
- Log console (`[Indicators] dedup cross-BU vendas: X → Y`) igual aos demais dedups para auditoria.

Escopo: **apenas a agregação Consolidado** e drill-downs de Vendas/Temperatura. Não altera a contagem individual por BU (Modelo Atual continua vendo o seu, Oxy Hacker o seu).

## 3) Blacklist total do card `Grupo Longuini` (1405505427)

**Confirmado no Pipefy:** card `1405505427` passou por `MQLs → Tentativas → Reunião agendada → Reunião Realizada → Perdido`. Fase Atual = **Perdido** com motivo "Empresa fora do ICP". Pelo princípio de throughput, ele ainda soma em MQL/RM/RR realizados de Julho.

**Correção — adicionar à lista de teste/junk existente:**
- `src/hooks/useModeloAtualMetas.ts` → `TEST_CARD_IDS.add('1405505427')` com comentário `// Grupo Longuini - blacklist manual (movido pra Perdido, contava em RM/RR)`.
- Como `isJunkCard` já é chamado em Modelo Atual, O2 TAX, Oxy Hacker e Expansão, e a base é `pipefy_moviment_cfos` compartilhada, uma única entrada exclui o card de MQL, RM, RR, Proposta e Venda em todas as BUs.

## Detalhes técnicos

Arquivos alterados:
- `src/hooks/useModeloAtualMetas.ts` — patterns de email + blacklist Longuini + assinatura `isJunkCard(email)`
- `src/hooks/useModeloAtualAnalytics.ts` — propagar `E-mail` no parse
- `src/hooks/useOxyHackerMetas.ts` — propagar email na chamada `isJunkCard`
- `src/hooks/useExpansaoAnalytics.ts` — idem (4 chamadas)
- `src/hooks/useO2TaxAnalytics.ts` — `parseRawCard` inclui email
- `src/components/planning/IndicatorsTab.tsx` — dedup cross-BU por `id` no Consolidado (vendas + temperatura)

Verificação após build:
- Console: novo log `[Indicators] dedup cross-BU vendas: N → M` deve aparecer com M<N quando duplicata GSC existir.
- Card 1405505427 sumir das seções de MQL/RM/RR/Venda em Julho/26.
- `teste_nao_atender@gmail.com` deixar de aparecer em qualquer drill-down.
