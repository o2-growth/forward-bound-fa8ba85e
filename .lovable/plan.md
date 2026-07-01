Já validei o commit `725803e` no turno anterior — os 3 blocos estão **FAIL** no código. Como você pediu de novo pra "testar", entendo que quer que eu **aplique as correções agora** (não só re-rodar o teste que vai dar o mesmo resultado). Segue o plano de implementação. Se você quer apenas re-testar sem mexer, me avisa.

## Correções a aplicar

### Fix 1 — Coluna "Fase Atual" no drill-down RR
**Arquivo:** `src/components/planning/IndicatorsTab.tsx` (builder do drill-down "Reunião Realizada")
- Adicionar coluna `phase` ao array de colunas do RR, na ordem: Produto | Empresa | Closer | Faixa Faturamento | **Fase Atual** | Tempo até Reunir | Data.
- Popular `phase` a partir de `card.current_phase` / `phase_name` (mesmo campo já usado no drill-down de Proposta).
- Ajustar o drill-down de **Proposta enviada** para também ler `current_phase` real em vez de rótulo fixo "Proposta enviada / Follow Up".

### Fix 2 — Marketing: fontes de dados alinhadas
**Arquivos:**
- `supabase/functions/read-marketing-sheet/index.ts` — incluir no JSON de retorno os campos `timeFerramentas`, `despesasTotais`, `investimentoEventos` (já lidos internamente, mas nunca expostos).
- `src/hooks/useMarketingSheetData.ts` — já declara os 3 campos, apenas confirmar tipagem.
- `src/hooks/useMarketingIndicators.ts` — zerar `mqls` de `meta_ads` e `google_ads` (já está 0, revalidar que não há regressão com proporção).
- `src/components/planning/MarketingIndicatorsTab.tsx` (seção Enriched Channels / coluna Eventos) — trocar `25000` hardcoded por `sheetData.investimentoEventos ?? 25000`.
- `src/components/planning/marketing-indicators/` (gauge CAC) — adicionar sublabel `"Somente mídia — OPEX não incluído"` no gauge; manter Hero CAC com OPEX+timeFerramentas.

### Fix 3 — Visão do CEO
**Arquivos em `src/components/planning/ceo/`:**
- `ceoShared.tsx` (`sumMonths` / iterador de meses) — reescrever loop para iterar corretamente quando `to.year > from.year` (ex.: usar `addMonths` até `<= endOfMonth(to)` em vez de `for m in 1..12` no mesmo ano).
- `DreSection.tsx` — garantir que as linhas Oxy Hacker e Franquia leiam de `realizedDRE[bu]` (mesmas fontes de `FinancialTab`), não filtradas fora.
- `FinanceiroSection.tsx` — renomear card "Retenção" → **"Churn Rate"**, exibir `churnRate` direto (não `100 - churnRate`), adicionar sublabel `"Histórico total — base ativa desde início"`.

## Validação após aplicar
1. `tsgo` — 0 erros de tipo.
2. Playwright headless com sessão Supabase restaurada:
   - Drill-down RR (com/sem filtro Closer) — confere 7 colunas + valores distintos em "Fase Atual".
   - Drill-down Proposta — "Fase Atual" mostra Ganho/Perdido/Follow Up.
   - Aba Marketing → Enriched Channels: MQL Meta/Google = 0, coluna Eventos usa valor da planilha; interceptar response de `read-marketing-sheet` e confirmar 3 campos novos; gauge CAC com sublabel.
   - Visão CEO: DateRange 15/11/2025→15/01/2026 → Receita/pessoa e Receita do período > 0; DRE com Oxy Hacker e Franquia > 0; card "Churn Rate" com valor pequeno + sublabel.
3. Console = 0 exceções.
4. Reporte final PASS/FAIL por item com screenshots e go/no-go para push.

## Fora de escopo
- Não altero regras de MQL, funil, ou lógica de atribuição.
- Não mexo em outras abas nem em migrations.
