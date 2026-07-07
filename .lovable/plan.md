## Diagnóstico

Ao salvar Julho em Plan Growth, dois efeitos colaterais atingiram Junho:

1. **Cascade flush** (`MediaInvestmentTab.tsx` linhas 2064–2095): reescreve `faturamento/mrr/setup/pontual` de **todos** os meses de Modelo Atual quando o valor recomputado difere do gravado — sem respeitar meses passados/fechados.
2. **Sync funnel_metas** (linhas 2107–2143): empurra `leads/mqls/rms/rrs/propostas/vendas` de **todos** os meses das 4 BUs para `funnel_metas`, filtrando só por `is_locked`. Como Jun não é lock, foi sobrescrito.

Histórico no `audit_log` confirma: Jun foi tocado 12× desde 06/07, oscilando fat de 1.613.491,80 → 3.778.812,63 → 1.613.491,80 → **1.974.378,60** (estado atual). A Vender de Jun antes dessa contaminação era **R$ 400.000,00**, com faturamento gravado em **R$ 1.493.388,71** (snapshot de 30/05, última edição humana estável).

## Plano

### Passo 1 — Corrigir o código (previne recorrência)

**`src/components/planning/MediaInvestmentTab.tsx`**

- **Cascade flush (bloco 2064–2095)**: adicionar filtro que pula meses anteriores ao mês corrente (`monthIndex < currentMonthIndex`) e meses `is_locked`. Só Jul–Dez podem ser tocados pela cascade forward de MRR.
- **Sync funnel_metas (bloco `buildItems` 2111–2127)**: aplicar o mesmo skip de meses passados, além do skip de `is_locked` já existente.
- **Guard**: `console.warn` se algum update tentar mudar mês < corrente.

Comportamento preservado: edições explícitas do usuário em qualquer mês via `pendingChanges` continuam salvando; regra `is_locked` continua respeitada.

### Passo 2 — Restaurar Junho no banco

Usar tool `insert` (UPDATE) com base no snapshot de 30/05/2026 (última edição humana consistente):

**`monetary_metas`** (bu=modelo_atual, month=Jun, year=2026):
- `faturamento` = 1.493.388,71 (MRR base ~1.093.388,71 + A Vender 400.000)
- `mrr` = 373.347
- `setup` = 896.033
- `pontual` = 224.008
- `vendas` = recomputar via `faturamento / ticket_medio`

**`funnel_metas`** (bu=modelo_atual, month=Jun, year=2026): restaurar para o snapshot pré-cascade de 06/07 00:20:43 (primeiro `old_values` da sequência de Pedro):
- `leads` = 1993, `mqls` = 857, `rms` = 343, `rrs` = 275, `propostas` = 220, `vendas` = 55

*(Se você preferir outros números de funil, me diga antes que eu execute o UPDATE.)*

### Passo 3 — Verificação

1. `SELECT` em `monetary_metas` e `funnel_metas` de Jun/modelo_atual — confirmar valores restaurados.
2. Abrir Plan Growth, editar qualquer mês de Jul em diante, salvar.
3. Reler as duas tabelas para Jun — devem permanecer intactas.
4. Reler Jul–Dez — devem refletir a nova cadeia.

## Observação técnica

O `audit_log` guarda `old_values`/`new_values` completos em JSON, então dá pra restaurar qualquer versão histórica se você quiser um snapshot diferente do de 30/05.
