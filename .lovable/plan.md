## Plano: Auto-lock de meses iniciados com backup prévio

### Etapa 1 — Backup completo (antes de qualquer alteração)

Exportar o estado atual da tabela `funnel_metas` para um arquivo CSV em `/mnt/documents/`:

- **Arquivo:** `/mnt/documents/funnel_metas_backup_2026-05-08.csv`
- **Conteúdo:** todas as linhas (`bu`, `month`, `year`, `leads`, `mqls`, `rms`, `rrs`, `propostas`, `vendas`, `faturamento_meta`, `faturamento_vender`, `mrr_base_planejamento`, `investimento`, `is_locked`, `updated_at`)
- **Como restaurar:** se necessário, basta um `UPSERT` a partir do CSV revertendo `is_locked` e os valores numéricos ao estado anterior. Vou deixar o comando de rollback documentado no final desta resposta após o backup ser gerado.

Também vou imprimir no chat um snapshot SQL das 4 linhas de Maio/2026 (estado atual) para referência rápida.

### Etapa 2 — Snapshot e lock automático de Maio/2026

Como Maio já começou (hoje = 08/Mai/2026) e a regra é "mês iniciado deve estar travado":

1. Calcular os valores do Plan Growth ao vivo para Maio/2026 nas 4 BUs (Modelo Atual, O2 TAX, Oxy Hacker, Franquia) — usando exatamente a mesma lógica do `usePlanGrowthData.ts` que hoje produz 537 MQLs em Modelo Atual.
2. `UPSERT` em `funnel_metas` (4 linhas, uma por BU) com:
   - `leads`, `mqls`, `rms`, `rrs`, `propostas`, `vendas` = valores ao vivo
   - `faturamento_meta`, `faturamento_vender`, `mrr_base_planejamento`, `investimento` = valores ao vivo
   - `is_locked = true`
3. Isso é uma operação one-shot via `supabase--insert` (UPSERT). Não envolve migration nem mudança de schema.

### Etapa 3 — Auto-lock para meses futuros (código)

Adicionar lógica em `usePlanGrowthData.ts` que, ao carregar os dados, identifica meses onde `startOfMonth ≤ hoje` e `is_locked = false` em qualquer BU, e dispara o snapshot+lock automaticamente (uma vez, com guard via `useRef` para não repetir).

- Quando Junho começar (01/Jun/2026), o app trava Junho automaticamente na primeira carga.
- Meses já travados (Jan, Fev, Mar, Abr) não são tocados.
- Meses futuros (Jul+) continuam mostrando cálculo ao vivo do Plan Growth.

### Etapa 4 — UI no Plan Growth

Em `MediaInvestmentTab.tsx`, mostrar badge "Travado (mês iniciado)" e desabilitar inputs para meses com `startOfMonth ≤ hoje`.

### Etapa 5 — Validação

1. Conferir CSV de backup salvo em `/mnt/documents/`.
2. Reload do app → Indicadores → Comercial → Modelo Atual → Mai/2026 deve mostrar **537 MQLs** (mesmo valor do Plan Growth).
3. Query no DB confirma 4 linhas de Maio/2026 com `is_locked = true`.
4. Plan Growth mostra badge "Travado" em Maio.

### Rollback (se quiser desfazer)

Se quiser voltar ao estado anterior, basta pedir "reverter lock de Maio" — eu releio o CSV de backup e faço UPSERT restaurando os valores e `is_locked = false`. O backup fica permanente em `/mnt/documents/`.

### Observações técnicas

- **Escrita no banco:** sim, vai escrever 4 linhas em `funnel_metas` para Maio/2026. Sem migration, sem mudança de schema.
- **Sem alteração** em RLS, `monetary_metas`, `mrr_base_monthly`, `IndicatorsTab`, `LeadsMqlsStackedChart`.
- O cálculo do Plan Growth para meses não travados continua igual.
