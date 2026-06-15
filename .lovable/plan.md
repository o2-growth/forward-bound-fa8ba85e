## Objetivo
Listar todos os cards da BU Expansão (Franquia e Oxy Hacker) que entraram em **fases de Lead** durante **junho/2026** sem `SDR responsável` preenchido, para você corrigir no Pipefy.

## Contexto já levantado
Rodei o `aggregate` no Pipefy para `pipefy_cards_movements_expansao` em junho/2026:

- 372 cards únicos no mês
- Fases-alvo (Leads): **Start form (45)**, **Lead (47)**, **Tentativas de contato (43)** → ~133 movimentos / ~120 cards únicos a auditar
- Atualmente não existe ação no `query-external-db` que devolva só esses campos filtrados por SDR nulo — o `query_period` traz 100+ colunas por linha (resposta enorme, inviável de paginar no chat)

## O que vou fazer

1. **Adicionar uma ação `lead_sdr_diagnosis`** na edge function `supabase/functions/query-external-db/index.ts`.

   Comportamento:
   - Input: `{ table, startDate, endDate, produto? }`
   - SQL (somente leitura):
     ```sql
     SELECT "ID","Título","Produtos","Fase","Entrada",
            "SDR responsável","Closer responsável","Data Criação",
            "Origem do lead","Investimento disponível"
     FROM pipefy_cards_movements_expansao
     WHERE "Entrada" >= $1 AND "Entrada" <= $2
       AND "Fase" IN ('Start form','Lead','Tentativas de contato')
     ORDER BY "Entrada" ASC
     ```
   - Após receber as linhas, deduplica por `ID` (mantendo a entrada mais recente) e separa em dois buckets: `withSdr` e `withoutSdr` (string vazia ou null).
   - Aplica o fix de **atribuição retroativa** (`useExpansaoAnalytics.ts` linhas 369–380): se o mesmo card tiver SDR preenchido em qualquer outro movimento, considera "com SDR" — isso evita falso-positivo de cards que ganharam SDR só ao chegar em "Tentativas de contato".
   - Retorna `{ withoutSdr: [...], summary: { total, withSdr, withoutSdr, byProduto } }`.

2. **Filtrar test cards** com a mesma lista usada em `isTestCard` (já existente).

3. **Rodar a ação** logo após o deploy e te entregar:
   - Tabela com **Card ID, Título, Produto, Fase, Data, link Pipefy** dos cards sem SDR
   - Quebra Franquia × Oxy Hacker
   - Total absoluto e % do mês

## Arquivos tocados
- `supabase/functions/query-external-db/index.ts` (+ ~40 linhas, novo branch `else if (action === "lead_sdr_diagnosis")`)

## O que NÃO vou fazer
- Nenhuma alteração de UI/dashboard
- Nenhum `UPDATE` no Pipefy (a correção dos SDRs continua manual no Pipefy ou via aba admin existente)

Confirma que posso seguir?