## Diagnóstico do "Leads Total" divergente

**KPI "Leads: 1.720"** dedupa leads por e-mail/nome em todos os grupos visíveis (um lead que apareceu em 3 lives conta 1x).

**Tabela "Consolidado por categoria"** soma `inscritos` de cada `LiveGroup` sem dedupe entre grupos → um lead presente em 2 lives entra 2x na linha "LIVE", e mais uma vez se também estiver num evento. Por isso Live=1.804 + Palestras=47 + Eventos=17 já ultrapassa 1.720.

Ou seja: o número certo é 1.720 (dedupado). As linhas da tabela é que estão inflando por dupla contagem.

## Mudanças

1. **Corrigir agregados da tabela (categoria / subcategoria / item)**
   - Em `buildTree`, trocar `addToAgg` (soma numérica) por uma agregação baseada em conjuntos de leads deduplicados por e-mail/nome (`Set<string>` por nó), calculando `inscritos/mqls/emContato/quentes/fechados/perdidos` sobre esse conjunto único.
   - Valores monetários (mrr, setup, pontual, tcv) também dedupados por lead ganho para evitar duplicar venda que apareceu em >1 live (as vendas G4 já são atribuídas a 1 live só via `pickClosestLive`, então na prática soma direta; ainda assim, a consolidação por lead único garante consistência).
   - Resultado esperado: LIVE + PALESTRAS + EVENTOS ≤ Total, e Total ≡ KPI "Leads".

2. **Remover categoria "Seller"**
   - Tirar `{ categoria: "Seller", subs: [] }` do `SCAFFOLD` em `G4ConsolidatedDashboard.tsx`.
   - Confirmar em `canonLive.ts` que nada é classificado como `"Seller"` (se sim, remapear para `"Eventos"`).

3. **Remover a frase "2 excluídos por origem não-G4"**
   - Tirar o `hint={excludedByOrigin > 0 ? ... : undefined}` do KPI "Leads" (linha ~1059) e o `useMemo excludedByOrigin`.

## Fora do escopo

- Não mexer nas somas do drill-down (já dedupam por conta própria).
- Não mexer nas regras de atribuição G4, whitelist Finders Fee ou overrides de valor (Martinelli).
