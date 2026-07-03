## Objetivo
Validar em runtime que o Cenário de Caixa está correto após a última alteração (ignorar período para cards em aberto) e confirmar que a lógica de hidratação de valores (_1 e texto) não deixa nenhum card com R$ 0 indevido.

## Escopo da validação
Somente leitura — nenhuma mudança de código. Se algum problema for encontrado, volto com um plano de correção separado.

## O que já está estabelecido pela leitura do código

1. **Cenário de Caixa consome 4 BUs comerciais** (Modelo Atual, Outbound, Franquia, Oxy Hacker) via `computeCashFromCard` + regras `CASH_RULES`. Monetização entra na agregação por temperatura, mas sua regra é `{ mrr: 0, setup: 0, pontual: 0 }` → **não contribui para caixa por design**. Os campos `_1` e texto extraído da Monetização afetam o Funil de Monetização, não o Cenário de Caixa.
2. **Modelo Atual / Outbound** usam `valorMRR`, `valorSetup`, `valorPontual` já parseados do movimento Pipefy (`Valor MRR`, `Valor Pontual`, `Valor Setup`). Não há fallback `_1` — nunca houve nesse hook.
3. **Franquia / Oxy Hacker** (useExpansaoAnalytics) idem: leem `Valor MRR/Pontual/Setup` da linha do movimento.
4. **Filtro de período** agora está desligado no Cenário de Caixa via `includeAllOpenIgnoringPeriod: true` (já aplicado em `temperaturaAggregator.ts`).

## Passos de validação em runtime

### 1. Playwright na preview
- Abrir `/` logado, ir até a seção Cenário de Caixa.
- Screenshot dos dois cards (Realista / Otimista) com os totais e barra por BU.
- Trocar o filtro de período para outro mês → confirmar que os **totais/contagens não mudam** (prova de que o filtro foi ignorado).
- Trocar de volta e abrir "Ver detalhes" do cenário Realista → screenshot da tabela; olhar coluna `Total Caixa` e conferir que não há linhas com R$ 0 exceto Monetização (rule 0/0/0).

### 2. Cross-check nos logs do console
- Rodar `code--read_console_logs` filtrando por `useModeloAtualAnalytics`, `useExpansaoAnalytics`, `Monetização`, para confirmar que as consultas retornaram cards e que `valor_* fields detectados` foi logado.

### 3. Query no DB externo (via edge function `query-external-db`)
- Para 3 cards abertos por BU (amostra), inspecionar `Valor MRR/Setup/Pontual` no `pipefy_moviment_contrato`. Se algum vier zerado no DB, o R$ 0 no Cenário é fiel ao dado bruto (não é bug do hook) — reportarei nome+ID para eventual correção manual no Pipefy.

### 4. Regressão da Seção Temperatura (acima do Cenário)
- Confirmar que os contadores **variam** ao trocar o filtro de período (comportamento antigo preservado — o flag só é passado pelo Cenário de Caixa).

## Entregável
Um relatório curto no chat com:
- Screenshots dos dois cenários antes/depois de trocar o período.
- Lista de eventuais cards com R$ 0 no Cenário, separando "R$ 0 legítimo (rule=0 ou dado bruto zerado)" de "R$ 0 suspeito (dado no DB mas não hidratado)".
- Confirmação de que Temperatura seguiu variando com o filtro.

Se aparecer categoria "R$ 0 suspeito", volto com plano de correção para o hook responsável (Modelo/Outbound/Expansão).
