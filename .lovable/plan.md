# Funil Monetização: Concluído filtra período, demais fases sempre visíveis

## Regra desejada

- **Concluído**: apenas cards que foram concluídos **dentro do período** filtrado (comportamento atual).
- **Todas as outras fases** (`Start form`, `Oportunidade Levantada`, `Proposta em Elaboração`, `Proposta enviada / Follow Up`, `Aprovado pelo Cliente`, `Jurídico`, `Faturamento`): mostram **todos os cards atualmente parados nelas**, independente do período — para dar visibilidade do que está "na mesa" agora.

Escopo estritamente restrito ao Funil de Monetização — nada muda no acelerômetro Comercial, MQL, etc.

## Mudanças

### 1. `supabase/functions/query-external-db/index.ts` — nova action `query_open_pipeline`

- Retorna o **estado atual** de cada card do pipe Monetização cuja `Fase Atual` seja diferente de `Concluído` (e sem `motivo_da_perda`, para não trazer perdidos antigos).
- Estratégia: consulta `pipefy_moviment_contrato` pegando o **movimento mais recente por ID** (`DISTINCT ON (ID) ... ORDER BY ID, Entrada DESC`) filtrando `Fase Atual NOT IN ('Concluído')`.
- Retorna as mesmas colunas usadas por `query_period` para reuso direto no hook.

### 2. `src/hooks/useMonetizacaoAnalytics.ts` — combinar duas fontes

- Manter `query_period` (já existente) — cards com movimentação **no período**. Deles, aproveitamos os que caíram em `Concluído` no período (para o card "Valor concluído" e para a fase Concluído no mini-funil).
- Adicionar chamada em paralelo à nova action `query_open_pipeline` — cards em fases abertas, sem filtro de tempo.
- **Merge por ID**: se um ID vier em ambos, dedup priorizando a linha do período quando a fase for `Concluído`, caso contrário a linha do pipeline aberto.
- Continuar hidratando valores via `query_card_history` sobre a união de IDs (concluídos no período + abertos atuais).
- Regras derivadas:
  - `byFase`: agregação natural — Concluído recebe só os do período; demais recebem os do pipeline aberto.
  - `totals.valorPipeline` = soma dos cards em fases abertas.
  - `totals.valorGanho` = soma dos concluídos no período (inalterado).
  - `totals.count` = total combinado (abertos + concluídos no período).
  - `byTipo`: baseado na união (mostra tudo que está na mesa + o que fechou no período).
- `getDetailItemsForIndicator('venda')`: continua filtrando por `fasesNoPeriodo ⊇ Concluído` — só do período.

## Arquivos

- `supabase/functions/query-external-db/index.ts` — adiciona action `query_open_pipeline`.
- `src/hooks/useMonetizacaoAnalytics.ts` — segunda query + merge de cards abertos vs. concluídos no período.

## Validação

- Aba Monetização com filtro apertado (ex.: um único dia): a fase **Concluído** mostra somente o que fechou naquele dia; as demais fases continuam exibindo todos os cards abertos hoje.
- Trocar o período não altera contagens de fases abertas — só muda a fase Concluído e o "Valor concluído".
- Drill-down de "Todos os cards" traz abertos + concluídos-no-período; drill-down por fase Concluído traz só os do período.
