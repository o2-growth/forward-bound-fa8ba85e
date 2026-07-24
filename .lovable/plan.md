## Auditoria — mudanças na base externa do G4

Comparei o schema atual das tabelas externas (`G4_PG_URL`) com o SQL que `supabase/functions/g4-metrics/index.ts` consome hoje.

### O que mudou (colunas novas que o dashboard ainda ignora)

**`g4_leads_360`** — ganhou uma camada de atribuição pré-calculada:
- `card_id` (bigint) — link direto ao Pipefy sem depender de match por e-mail
- `is_ganho` (bool), `data_ganho` (date) — flag oficial de venda
- `venda_atribuivel_live` (bool) — venda que a base considera atribuível a G4
- `primeira_live_data` (date) — data da primeira live do lead
- `n_lives` (int), `lives_assistiu`, `lives_mao`, `lives_diagnostico` (arrays) — jornada já consolidada
- `valor_mrr`, `valor_setup` (numeric) — valores da venda materializados no lead

**`g4_diagnostico`** — ganhou:
- `pipefy_card_id` (text) — casamento sem depender de e-mail
- `live` (text) — hoje já é usada

**`g4_inscritos`** — ganhou:
- `fonte` (text) — origem da inscrição (não usada)

### Impacto no /dash-g4 hoje

1. Vendas do G4 são contadas por `pipefy_moviment_cfos."Fase Atual"='Ganho'` + whitelist manual de e-mails Finders Fee. A base já tem `is_ganho` + `venda_atribuivel_live` — mais confiável e sem depender de whitelist hard-coded.
2. Lives duplicadas ("Live G4 02-07" vs "Live - G4 02/07" vs "Live G4 - 02/07/2026") são canonicalizadas só no front (`canonLive.ts`). Com `card_id` + arrays já normalizados no BD, dá pra confiar mais no back.
3. Faturamento soma MRR+Setup+Pontual de qualquer card Ganho ligado a inscrito; com `venda_atribuivel_live` fica escopo correto.
4. Valores de venda (`valor_mrr`, `valor_setup`) agora ficam materializados em `g4_leads_360` — evita join extra.

### Escopo — só /dash-g4

**1. `supabase/functions/g4-metrics/index.ts`**
- Query de **funil por live**: usar `g4_leads_360.lives_mao` / `.lives_diagnostico` para "levantaram mão" e "diagnósticos", e `is_ganho + venda_atribuivel_live` para "vendas" — sem depender do join frágil por e-mail.
- Query de **faturamento**: filtrar por `venda_atribuivel_live = true` e somar `valor_mrr + valor_setup` de `g4_leads_360` (+ `Valor Pontual` de `pipefy_moviment_cfos` via `card_id`).
- Query de **leads**: trazer `card_id`, `is_ganho`, `data_ganho`, `venda_atribuivel_live`, `primeira_live_data`, `n_lives` e expor no payload; JOIN com Pipefy passa a usar `card_id` em vez de `lower(email)`.
- Query de **diagnósticos por live**: preferir `pipefy_card_id` quando existir; manter fallback por e-mail.
- Manter todos os filtros anti-teste e a whitelist Finders Fee como camada de segurança (whitelist agora é redundante se `venda_atribuivel_live` estiver populado, mas mantemos até validar).

**2. `src/components/planning/g4/G4ConsolidatedDashboard.tsx`**
- Estender `G4RealLead` com os novos campos (`cardId`, `isGanho`, `dataGanho`, `vendaAtribuivelLive`, `primeiraLiveData`, `nLives`).
- Regra de "venda G4": `vendaAtribuivelLive === true` OR whitelist Finders Fee (fallback). Some `MANUAL_EXCLUDED_G4_CARD_IDS`.
- Bucket de live: se `primeira_live_data` bater com uma live conhecida, usar direto; senão, cair na canonicalização atual (`canonLive.ts`).
- Card "Ranking Closer" e drill-down passam a mostrar `data_ganho` real quando existir.

**3. Deploy**
Redeploy `g4-metrics`. Não mexe em outras BUs, indicadores comerciais nem em `useModeloAtualMetas`, `useExpansaoAnalytics`, etc.

### Verificação
1. Chamar `g4-metrics` e conferir que `funil[].vendas` bate com `COUNT(*) FROM g4_leads_360 WHERE venda_atribuivel_live`.
2. Abrir `/dash-g4` (senha `g4-2026`) e conferir que os 9 clientes da planilha Finders Fee continuam aparecendo, sem duplicar.
3. Conferir que lives duplicadas colapsam corretamente (já feito no front, sem regressão).

### Fora de escopo
- Não altera aba Indicadores nem outras BUs.
- Não altera whitelist Finders Fee (usada como fallback).
- Não altera exclusão manual (Ediouro etc.).
