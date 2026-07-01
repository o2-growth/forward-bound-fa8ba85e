## Objetivo
Validar via Pipefy API **apenas Modelo Atual** (Jun/2026) contra o relatório, com o mínimo de chamadas.

## Números do relatório a bater (Modelo Atual · Jun/2026)
- MQL · RM · RR · Proposta · Venda (valores do `conferencia-acelerometros-jun-2026_v2.xlsx`, aba Pivot por estágio).

## Estratégia (mínimo de chamadas)
**1 única query GraphQL** ao Pipefy no pipe Modelo Atual, paginando `allCards` só nas fases-alvo com `first: 50` + cursor. Estimativa: ~10 páginas para cobrir todas as fases de Jun/2026.

Query única por página traz: `id`, `created_at`, `current_phase.name`, `phases_history { phase.name firstTimeIn lastTimeOut }`, e campos de faturamento (para threshold ≥ R$ 200k no MQL).

## Execução
1. Ler pipe ID + IDs das fases-alvo de Modelo Atual em `src/hooks/useModeloAtualAnalytics.ts` (ou `src/integrations/pipefy/*`).
2. Script `/tmp/verify_modelo_atual.py` usando `PIPEFY_API_KEY`:
   - Pagina `allCards` das fases: Novos Leads, MQLs, Reunião Marcada, Reunião Realizada, Proposta Enviada, Ganho, Contrato Assinado.
   - Aplica: dedup mensal por card+fase, exclusão de test cards, threshold MQL ≥ R$ 200k, prioridade "Ganho" sobre "Contrato assinado" na venda, `Data de assinatura do contrato` para atribuir mês da venda (regras já memorizadas).
3. Comparar com totais da aba Pivot do relatório → tabela **Pipefy vs Relatório vs Delta** por estágio.
4. Se houver delta, listar IDs dos cards divergentes com link Pipefy.

## Entregável
- Tabela comparativa no chat.
- Se houver divergências: `divergencias-modelo-atual-jun-2026.xlsx` com os cards em cada célula divergente.
