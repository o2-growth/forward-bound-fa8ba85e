## Resumo

1. Backup completo das 3 tabelas críticas antes de qualquer alteração.
2. Corrigir vazamento de R$ 108k em Maio (Oxy Hacker — cards Jean Morbis e Alexandre Corrêa).
3. Travar metas dos acelerômetros para meses fechados (Jan, Fev, Mar, Abr/2026) para que **não mudem mais** quando MRR Base ou Plan Growth forem editados.

---

## Etapa 1 — Backup (antes de qualquer mudança)

Criar tabelas de backup com snapshot completo do estado atual:

```sql
CREATE TABLE backups.monetary_metas_2026_05_04 AS SELECT * FROM public.monetary_metas;
CREATE TABLE backups.funnel_metas_2026_05_04   AS SELECT * FROM public.funnel_metas;
CREATE TABLE backups.mrr_base_monthly_2026_05_04 AS SELECT * FROM public.mrr_base_monthly;
CREATE TABLE backups.bu_indicators_config_2026_05_04 AS SELECT * FROM public.bu_indicators_config;
```

Schema `backups` será criado na primeira migration. Esses backups ficam disponíveis indefinidamente para rollback manual.

---

## Etapa 2 — Vazamento R$ 108k (Oxy Hacker)

**Causa**: `useOxyHackerMetas.ts` não aplica `shouldForceAssinaturaDate('expansao')` ao parsear movements. Isso já existe em `useExpansaoMetas.ts:95–103`. Os 2 cards (Jean Morbis 1328563759, Alexandre Corrêa 1343086683) ficam em Maio com fallback de R$ 54k cada → R$ 108k vazando como Pontual.

**Correção** (1 arquivo, ~6 linhas):
- Em `src/hooks/useOxyHackerMetas.ts`, replicar o bloco que `useExpansaoMetas.ts` já usa para forçar `dataEntrada = getForcedSaleDate()` quando `shouldForceAssinaturaDate(titulo, 'expansao')` retorna true.

**Resultado**: Pontual 01–04/Mai cai de R$ 108k para R$ 0; cards passam a contar em 15/Abr/2026 no monetário Oxy.

---

## Etapa 3 — Congelar metas dos acelerômetros para Jan–Abr/2026

### Diagnóstico confirmado

- `useConsolidatedMetas.ts:100` força `skipDb = true` para Modelo Atual → ignora `monetary_metas` e usa `funnelData` ao vivo.
- `funnelData` é gerado em `usePlanGrowthData.ts:556` a partir de `mrrDynamic.revenueToSell` → muda quando MRR Base muda.
- **Mas**: `monetary_metas` **já tem snapshot correto** dos valores de Jan–Abr/26 para as 4 BUs (consultado agora). Modelo Atual: 1125k / 1181k / 1334k / 1509k. Franquia Abril: 420k Pontual. Oxy Abril: 108k Pontual. O2 TAX Abril: 40k.
- E `funnel_metas` para Modelo Atual já está com `is_locked=true` em Jan–Abr/26, com `faturamento_meta` + `mrr_base_planejamento` snapshotados.

### Correção (sem nova tabela, sem novo seed)

Em `src/hooks/useConsolidatedMetas.ts`:

1. **Remover `skipDb = true` para Modelo Atual** quando o mês estiver locked. Ou seja: se `funnel_metas.is_locked = true` para `(modelo_atual, mes, ano)`, **prioriza `monetary_metas.faturamento − mrr_base_planejamento` (do `funnel_metas`)** como Fat Incremento congelado, em vez de `funnelData` ao vivo.
2. **Para todas as outras BUs** (Franquia, Oxy, O2 TAX): `monetary_metas` já vence `funnelData` quando há valor > 0. Já está correto. Apenas garantir que o caminho não seja afetado.

**Comportamento resultante**:
- Mês locked (Jan/Fev/Mar/Abr/26): meta lê de `monetary_metas` + `funnel_metas` snapshot. **Não muda mais** mesmo se MRR Base for editado.
- Mês aberto (Mai/26 em diante): comportamento atual — calcula ao vivo via Plan Growth.

**UI** (opcional, pequena adição em `IndicatorsTab.tsx`): badge discreto "🔒 Meta congelada" no card quando o período selecionado cai inteiramente em meses locked.

### Validação esperada após implementação

Cenário Abril/2026, filtro Franquia (print 1):
- MQLs Meta: 30 ✓ (vem de `funnelData` via `distributeAnnualToMonthly`)
- Vendas Meta: 1 ✓
- Pontual Meta: R$ 420k ✓ (vem de `monetary_metas.franquia.Abr.pontual`, já existe)
- Fat Incremento Meta: R$ 420k ✓

Cenário Abril/2026, Consolidado (print 2):
- Fat Meta: R$ 1,2M = soma 4 BUs (1509k + 40k + 108k + 420k = ~2,07M total faturamento → mas Fat **Incremento** = total − MRR Base, então com MRR Base de Modelo Atual 700k = ~1,37M; valor exato dependerá do snapshot do `funnel_metas`)
- MRR Meta: R$ 160k, Setup Meta: R$ 384k, Pontual Meta: R$ 624k

Após implementação, alterar `mrr_base_monthly` de Mar/26 ou Abr/26 **não muda** nenhuma dessas metas.

---

## Arquivos alterados

- **Migration 1**: `CREATE SCHEMA backups` + 4 backups.
- **Migration 2** (sem mudança de schema): nada — já está tudo na tabela.
- **`src/hooks/useOxyHackerMetas.ts`**: aplicar `shouldForceAssinaturaDate` no parsing.
- **`src/hooks/useConsolidatedMetas.ts`**: respeitar `is_locked` do `funnel_metas` para Modelo Atual.
- **`src/hooks/useFunnelMetas.ts`**: expor função `isMonthLocked(bu, month, year)` e `getLockedSnapshot(bu, month, year)` para o consolidado consumir.
- **`src/components/planning/IndicatorsTab.tsx`** (opcional): badge "Meta congelada".

---

## Ordem de execução

1. Migration de backup (4 tabelas em schema `backups`).
2. Edit `useOxyHackerMetas.ts` (vazamento R$ 108k).
3. Edit `useFunnelMetas.ts` + `useConsolidatedMetas.ts` (lock-aware).
4. (opcional) Badge na UI.
5. Validação manual: usuário recarrega, conferimos que Abr/26 nos prints permanece igual; depois faz edit em MRR Base de Mar/26 e confirma que metas não mudaram.