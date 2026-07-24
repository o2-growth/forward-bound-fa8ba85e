## Diagnóstico

O regex `isJunkCard` já pega "testeg4", "testejv", "testenormal1", "testeg41" (validado). Se ainda aparecem, o motivo mais provável é uma das três brechas abaixo — não confirmadas em runtime por causa do JWT do banco externo, mas cobertas pela correção:

1. **Hooks de Franquia / Oxy Hacker / O2 TAX / Expansão-metas** só passam `titulo: row['Título']` (e às vezes `email`) pro `isJunkCard`. Se o card de teste estiver com `Título` vazio e o texto "testeg41" aparecer só em `Nome` / `Empresa` / `Contato`, ele escapa. `useModeloAtualMetas` já cobre esses campos, os outros não.
2. **Agregadores de UI** (`TemperaturaSection`, `LeadsByPhaseSection`, `LossAnalysisSection`, drill-downs de Vendas/Propostas/RM/RR/MQL/Lead) não reaplicam `isJunkCard` — confiam 100% no filtro do hook. Basta uma brecha upstream pra vazar.
3. **React Query cache** pode estar servindo dado antigo (pré-fix do regex) até o próximo refetch.

## Correção (defesa em 2 camadas)

### Camada 1 — hooks (fechar o vazamento na origem)
Em cada `isJunkCard(...)` desses arquivos, passar **todos** os campos identificadores disponíveis (não só `titulo`/`email`):

- `src/hooks/useExpansaoAnalytics.ts` (4 chamadas)
- `src/hooks/useExpansaoMetas.ts` (1 chamada)
- `src/hooks/useOxyHackerMetas.ts` (1 chamada)
- `src/hooks/useO2TaxMetas.ts` (2 chamadas)

Novo shape: `{ id, titulo: row['Título'], nome: row['Nome'], empresa: row['Empresa'], contato: row['Contato'], email: row['E-mail'] }`.

### Camada 2 — agregadores/UI (rede de segurança)
Filtrar `DetailItem`s pelo mesmo `isJunkCard` antes de renderizar, usando `name`/`company`/`email` do item:

- `src/components/planning/indicators/temperaturaAggregator.ts` — filtrar em cada `src.toDetail(card)` antes de empurrar pro bucket.
- `src/components/planning/indicators/LeadsByPhaseSection.tsx` — mesmo filtro após `src.toDetail(card)`.
- `src/components/planning/indicators/LossAnalysisSection.tsx` — filtrar `getLostDeals.cards` antes de agregar (`titulo`, `motivoPerda` já disponíveis).
- `src/components/planning/IndicatorsTab.tsx` — no `dedupById` / builders de drill-down (Vendas, Propostas, RMs, RRs, MQLs, Leads), aplicar `isJunkCard({ titulo: name, empresa: company, email })` como último filtro antes de setar `items` do `DetailSheet`.

### Camada 3 — cache
Não versionar; só documentar que ao publicar, o `staleTime` (5–30min) faz refetch. Se o usuário quiser ver na hora, hard-refresh (Ctrl+Shift+R).

## Validação

- Console: `console.log('[junk] blocked at UI', item)` temporário nos 4 pontos do IndicatorsTab pra confirmar que a rede de segurança está pegando algo (se logar 0, o problema estava só no hook; se logar >0, a defesa em UI justificou-se).
- Verificar mentalmente que Martinelli, Lotus, Tchau Entrega e demais nomes válidos não casam com nenhum padrão.

## Escopo

Somente as alterações acima. Nenhuma mudança em métricas monetárias, cálculo de ticket médio, funil ou qualquer outra lógica de negócio.
