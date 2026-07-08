## Problema
A live **"Raio-X de Margens - G4"** está aparecendo no funil do G4 Real (3 inscritos), mas não é uma live real do funil G4 — não deve aparecer.

## Fix

Editar `supabase/functions/g4-metrics/index.ts` para excluir essa live em todos os pontos onde `g4_inscritos.live` é consultado:

1. **Query "funil por live"** (linha ~37-54) — adicionar `AND i.live <> 'Raio-X de Margens - G4'` no WHERE.
2. **Query "diagnóstico por live"** (linha ~55-62) — adicionar `AND live <> 'Raio-X de Margens - G4'` (por consistência, caso haja).
3. **Query "KPIs topo"** (linha ~63-69) — adicionar filtro na subquery `total_leads`: `AND live <> 'Raio-X de Margens - G4'` no `g4_inscritos`.
4. **CTE leads via `g4_leads_360`** — o campo `lives` (array) pode conter essa string; após o `SELECT`, remover a entrada do array ou filtrar leads cujo array só tenha essa live. Solução mais simples: no SELECT, aplicar `array_remove(l.lives, 'Raio-X de Margens - G4') AS lives` e opcionalmente filtrar leads cujo array resultante fique vazio E que não tenham `no_pipe`/`levantou_mao`/`fez_diagnostico` de outra origem.

Usar constante local `EXCLUDED_LIVES = ['Raio-X de Margens - G4']` no topo do arquivo para reuso.

Redeploy da função após a edição e validar via curl que a live sumiu de `funil`, KPIs totalLeads caiu em ~3, e nenhum lead ficou órfão.

## Fora de escopo
Nenhuma mudança de UI — o front consome direto o que a função retorna.
