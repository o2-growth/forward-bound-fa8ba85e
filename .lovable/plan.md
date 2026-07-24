## Objetivo
No dashboard `/dash-g4`, leads sem `data_evento`/`data_live` deixam de aparecer quando o filtro de data está ativo. Vou usar `created_at` do card no Pipefy como fallback para essa data efetiva, mantendo o comportamento atual para quem já tem data real.

## Mudanças

1. **Edge function `g4-metrics`**
   - No SELECT do `g4_leads_360`, incluir `created_at` (ou o campo equivalente já disponível: `card_created_at` / `first_seen_at` — confirmar no schema durante a implementação).
   - Retornar um novo campo `data_efetiva` por lead com a regra:
     `data_efetiva = data_live ?? data_evento ?? created_at`.
   - Retornar também `data_origem` (`'live' | 'evento' | 'created_at'`) para uso no tooltip.

2. **`G4ConsolidatedDashboard.tsx`**
   - Trocar o filtro de período para usar `data_efetiva` em vez de `data_live/data_evento`.
   - Manter o toggle "Incluir sem data" apenas para o caso extremo em que nem `created_at` existe (não deve mais acontecer, mas fica como salvaguarda).
   - No drill-down (`DetailSheet`), adicionar coluna/badge "Data (origem)" mostrando a data e um sufixo discreto quando vier de `created_at` (ex.: "12/06/2026 · criação").
   - KPIs, buckets por live/evento e agregações continuam usando `data_efetiva`; Finders Fee (que já não tem live) passa a respeitar o filtro pelo `created_at` do card em vez de ficar dependente do toggle.

3. **Sem alteração** em: classificação de eventos, whitelist de vendas, exclusões de teste, lógica de dedup por email e regras de atribuição.

## Detalhes técnicos
- Auditar no edge function qual coluna do `g4_leads_360` representa a criação do card (provavelmente `created_at` ou `card_created_at`) antes de referenciar.
- `data_efetiva` calculada no servidor para evitar divergência entre KPI e tabela.
- Nenhuma migration necessária — é campo já existente na base externa.