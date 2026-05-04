## Objetivo

Garantir que **as metas de Jan, Fev, Mar e Abr/2026 nunca mais mudem**, mesmo que o MRR Base desses meses seja corrigido futuramente (como aconteceu agora com Mar = R$ 733.281,13 vindo da Oxy).

A verdade financeira (MRR Base = Oxy) e o planejamento original (metas) precisam coexistir de forma independente para meses já fechados.

## Diagnóstico do que aconteceu

Quando o MRR Base de Mar caiu de R$ 755k → R$ 733k (correção Oxy), o gauge de MQL ficou vermelho porque parte da cadeia de metas é **calculada em tempo real** a partir do MRR Base, em vez de ler 100% dos valores fixos da tabela `funnel_metas`:

- ✅ **MQLs, RMs, RRs, Propostas, Vendas (quantidade)** — já vêm fixos de `funnel_metas` (não deveriam mudar)
- ❌ **Faturamento Meta / "A Vender" / Investimento** — recalculados em tempo real via `mrrDynamic` e `calculateReverseFunnel`, que dependem do MRR Base
- ❌ **Auto-seed** — pode reescrever Mai/2026 (mês "futuro" no momento do seed) com base em MRR Base já desatualizado

A cadeia recalcula: novo MRR Base → novo `revenueToSell` → novo `faturamentoMeta` por mês → novo `investimento` → e indiretamente novos cálculos derivados em outras telas que usam esses campos.

## Solução: snapshot imutável das metas de meses fechados

### 1. Estender `funnel_metas` para guardar os campos monetários

Hoje `funnel_metas` só guarda **quantidades** (leads, mqls, rms, rrs, propostas, vendas). Vamos adicionar:

- `faturamento_meta` (numeric) — meta de faturamento original do mês
- `faturamento_vender` (numeric) — "A Vender" original (Meta − MRR Base usado no planejamento)
- `mrr_base_planejamento` (numeric) — MRR Base que foi usado quando a meta foi planejada (referência histórica)
- `investimento` (numeric) — investimento de mídia planejado
- `is_locked` (boolean, default false) — quando true, o mês é tratado como **congelado**

### 2. Popular o snapshot para Jan–Abr/2026

Para os 4 meses, gravar:
- Quantidades já existentes (mantém os valores atuais de `funnel_metas`)
- `mrr_base_planejamento` = valor que o MRR Base tinha ANTES da correção Oxy (ex.: Mar = 755.281,13)
- `faturamento_meta` = meta original do plano
- `faturamento_vender` = `faturamento_meta − mrr_base_planejamento`
- `investimento` = valor planejado original
- `is_locked = true`

Para Mar/2026 especificamente: usar **R$ 755.281,13** como `mrr_base_planejamento` (o valor que estava em uso quando o plano foi montado), preservando assim o cálculo original.

### 3. Ajustar `usePlanGrowthData` para respeitar o lock

No merge do `modeloAtualFunnel` (e na publicação para `MediaMetasContext`):

- Se o mês tem `is_locked = true` → usar **100% dos valores da DB** (quantidades + monetários), ignorando completamente o cálculo dinâmico (`mrrDynamic`, `revenueToSell`, etc.)
- Se o mês não tem lock → comportamento atual (cálculo dinâmico)

Resultado: o MRR Base na tabela `mrr_base_monthly` continua sendo a verdade Oxy (R$ 733k para Mar), mas a meta de Mar permanece igual ao que estava antes (calculada com base em R$ 755k).

### 4. Proteger o auto-seed

O bloco de auto-seed (`hasSeeded.current`) só deve criar/atualizar meses que **não tenham lock**. Meses locked nunca são tocados pelo seed, mesmo se algum outro recálculo rodar.

### 5. UI mínima de transparência (opcional, recomendado)

Na aba Plan Growth, mostrar um **cadeado** discreto ao lado do mês quando `is_locked = true`, com tooltip: *"Meta congelada — planejamento original preservado. MRR Base real (Oxy): R$ X."* Sem botão de unlock no UI por enquanto (proteção contra acidentes).

## Detalhes técnicos

**Migration:**
```sql
ALTER TABLE funnel_metas
  ADD COLUMN faturamento_meta numeric DEFAULT 0,
  ADD COLUMN faturamento_vender numeric DEFAULT 0,
  ADD COLUMN mrr_base_planejamento numeric DEFAULT 0,
  ADD COLUMN investimento numeric DEFAULT 0,
  ADD COLUMN is_locked boolean DEFAULT false;
```

**Insert/update (Jan–Abr/2026, modelo_atual):** valores de `mrr_base_planejamento` virão de:
- Jan, Fev, Abr → valor atual de `mrr_base_monthly` (já bate com Oxy, sem mudança)
- Mar → **R$ 755.281,13** (valor pré-correção, recuperável do backup `/mnt/documents/mrr_base_backup_2026-05-04_v2.csv`)

`faturamento_meta` e `investimento` virão dos valores atualmente publicados em `modeloAtualFunnel` para esses meses (snapshot do estado atual).

**Arquivos a editar:**
- `src/hooks/usePlanGrowthData.ts` — adicionar branch que usa valores locked direto da DB
- `src/hooks/useFunnelMetas.ts` — expor novos campos no tipo `FunnelMetaRow`
- `src/integrations/supabase/types.ts` — atualizado automaticamente pela migration

**Arquivos NÃO afetados:**
- `mrr_base_monthly` permanece com valores Oxy (verdade financeira)
- `monetary_metas` e `funnel_metas` (quantidades) permanecem inalterados
- Tabela MRR Base no UI continua mostrando R$ 733k para Mar

## Resultado esperado

- ✅ MRR Base mostra Oxy (R$ 733.281,13 em Mar)
- ✅ Meta MQL Mar = 395 (não muda nunca mais)
- ✅ Meta de faturamento, "A Vender" e investimento de Jan–Abr ficam congelados
- ✅ Gauge MQL volta a mostrar a cor original (amarelo no caso de Mar)
- ✅ Meses futuros (Mai+) continuam funcionando dinamicamente como hoje
