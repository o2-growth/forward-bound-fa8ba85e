# Setar Closer = "Thiago Santana" no card Pipefy 1341215587

## Contexto
- Card: https://app.pipefy.com/open-cards/1341215587
- Ação: alterar apenas o campo "Closer responsável" para **Thiago Santana**. SDR permanece inalterado.

## Como será feito
O dashboard usa a edge function `query-external-db` com `action=update_field`, que só permite os campos `SDR responsável` e `Closer responsável` e roda a query:
```
UPDATE <tabela> SET "Closer responsável" = $1 WHERE "ID" = $2
```
Ela grava no mirror externo (o mesmo que alimenta os aceleradores/funil). Não altera o Pipefy diretamente — a próxima sincronização do Pipefy pode sobrescrever se o campo for editado lá também; para persistir do lado do Pipefy o usuário precisa editar o card na plataforma.

## Passos
1. Descobrir em qual tabela o card 1341215587 vive, tentando na ordem:
   - `pipefy_cards` (Modelo Atual — mais provável)
   - `pipefy_cards_expansao`
   - `pipefy_moviment_outbound`
   Usar `action: "history"` (leitura) para achar a tabela sem alterar nada.
2. Confirmar o SDR atual e o Closer atual do card via `action: "history"` (log para o usuário).
3. Chamar `update_field` com `field = "Closer responsável"`, `value = "Thiago Santana"`, `cardId = 1341215587` na tabela encontrada.
4. Reler o card para confirmar que o Closer virou "Thiago Santana" e o SDR não mudou.
5. Reportar ao usuário: SDR mantido, Closer antes → depois.

## Observação
Caso o card não exista em nenhuma das tabelas espelhadas, avisar o usuário e sugerir editar diretamente no Pipefy.
