## Objetivo

Validar duas regras já no ar:
1. **MQL por faturamento** (independente da fase): card criado no período + faixa ≥ R$ 200k (Modelo Atual) / ≥ R$ 500k (O2 TAX) deve aparecer como MQL em qualquer fase.
2. **Filtro de origem "Eventos"**: cards com qualquer sinal "G4" (tipo, origem, fonte ou campanha) devem ser contabilizados quando o filtro Eventos estiver ativo no Indicador Comercial.

## Validação 1 — MQL por faturamento

**Fonte de verdade (DB externo via `query-external-db`):**
- Consulta direta na `pipefy_moviment_cfos` (Modelo Atual) e equivalente O2 TAX para o período atual:
  - `COUNT(DISTINCT card_id)` onde `"Data Criação" ∈ período` E `"Faixa de faturamento mensal" ∈ MQL_QUALIFYING_TIERS` E não está em motivo de perda excluído E não é card de teste.
- Quebrar por **fase atual** para confirmar que cards fora de "MQLs" também são contados (ex.: "Novos Leads", "Tentativas de contato", "RM", "Proposta", "Ganho").

**Confirmação visual (Playwright headless em `http://localhost:8080`):**
- Logar com sessão Supabase injetada, abrir Indicador Comercial.
- Capturar o número do card "MQL" (Modelo Atual e depois O2 TAX).
- Clicar no card para abrir o drilldown e contar quantos itens são listados.
- Conferir que: número no card == itens no drilldown == valor do SQL.
- Screenshot de cada etapa e dump da lista de fases atuais dos cards exibidos.

**Critério de sucesso:** os três valores coincidem e a lista de fases inclui pelo menos uma fase ≠ "MQLs".

## Validação 2 — Filtro Origem "Eventos"

**Fonte de verdade (DB):**
- Na `pipefy_moviment_cfos`, contar cards criados no período cujo qualquer campo de origem contenha "g4" (case/acento-insensitive): "Tipo do lead", "Origem", "Origem do lead", "Fonte", "Campanha", "UTM Source", etc. — espelhando a normalização em `src/lib/leadSource.ts` (`classifyLeadSource`).

**Confirmação visual (Playwright):**
- Abrir Indicador Comercial Consolidado, sem filtro de origem → registrar totais (MQL, Proposta, Venda, Receita).
- Aplicar filtro Origem = **Eventos**.
- Conferir que:
  - Os totais reduzem para o subconjunto Eventos.
  - O número de leads/MQL com filtro Eventos bate (±0) com o COUNT do SQL acima.
  - O drilldown de "MQL" com filtro Eventos lista apenas cards G4 (validar amostra de 3-5 títulos contra a coluna de origem no DB).
- Screenshot do dashboard antes/depois do filtro e da lista do drilldown.

**Critério de sucesso:** o filtro de fato reduz os números e os cards listados batem com a query G4.

## Entregável

Relatório em chat com:
- Para cada validação: número esperado (SQL), número exibido (UI), diferença, screenshots referenciados em `/tmp/browser/mql-eventos/`.
- Se houver discrepância, indicar a causa provável (ex.: fase específica não mapeada, campo de origem não normalizado) — sem corrigir; abrir plano de ajuste separado.

## Fora do escopo

- Alterações de código. Esta é uma rodada apenas de **validação**.
- Expansão e Outbound (regra do MQL por faturamento se aplica só a Modelo Atual + O2 TAX, conforme decidido).
