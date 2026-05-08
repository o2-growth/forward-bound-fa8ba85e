## Objetivo

Quando o MRR projetado pela cadeia do Plan Growth (Modelo Atual) ficar acima do MRR real puxado da Oxy nos meses fechados, somar esse déficit ao "faturamento a vender" de **Dezembro/2026** — preservando a meta anual da BU. Aplicar somente ao **Modelo Atual** e recalcular todos os meses (incluindo travados).

---

## Etapa 1 — Backup (segurança)

Exportar duas tabelas para `/mnt/documents/`:
- `funnel_metas_backup_pre-gap-fix_2026-05-08.csv` — todos os 12 meses x 4 BUs.
- `mrr_base_monthly_backup_pre-gap-fix_2026-05-08.csv` — para referência da fonte Oxy usada no cálculo.

Rollback: re-inserir as linhas via UPSERT a partir do CSV.

---

## Etapa 2 — Apagar todos os locks de 2026 do Modelo Atual

Para que a nova regra recalcule do zero:

```sql
DELETE FROM funnel_metas WHERE bu='modelo_atual' AND year=2026;
```

(Outras BUs ficam intactas — Franquia/Oxy Hacker/O2 Tax já têm seus locks de Jan-Mai e não usam cadeia de MRR.)

---

## Etapa 3 — Implementar regra do gap em `usePlanGrowthData.ts`

### 3.1 Novo cálculo de gap

Adicionar `useMemo` que computa, para cada mês com dado Oxy disponível (`mrrBaseRealPorMes[m] > 0`):

```
gap_m   = mrr_chain_projetado[m] − mrr_oxy_real[m]
gapTotal = Σ max(0, gap_m)   // só déficit, ignora superávit
```

### 3.2 Ajustar `revenueToSell` de Dez

Após `calculateMrrAndRevenueToSell`, antes do `calculateReverseFunnel`:

```ts
if (gapTotal > 0) {
  mrrDynamic.revenueToSell['Dez'] += gapTotal;
  mrrDynamic.vendasPorMes['Dez'] = Math.round(
    mrrDynamic.revenueToSell['Dez'] / indicadoresPorBU.modeloAtual.ticketMedio
  );
}
```

Isso faz a `calculateReverseFunnel` propagar automaticamente o aumento em Dez para `faturamentoVender → vendas → propostas → rrs → rms → mqls → leads`.

### 3.3 Logging

Adicionar `console.log('[GapMRR]', { porMes: gap_m, gapTotal, dezAjustado })` para diagnóstico.

---

## Etapa 4 — Re-travar com nova lógica

O `useEffect` de auto-lock (linhas 567-644) já roda quando não há linhas travadas. Após Etapa 2, ele vai gravar Jan-Mai (mês corrente = Mai) com os novos valores que incluem a redistribuição de gap em Dez.

Nenhuma mudança no auto-lock necessária — ele vai capturar o snapshot já corrigido.

---

## Etapa 5 — Validação

1. Recarregar app autenticado.
2. Conferir no console `[GapMRR]` mostra os deltas.
3. Query: `SELECT month, mqls, faturamento_vender FROM funnel_metas WHERE bu='modelo_atual' AND year=2026 ORDER BY mês`.
4. Esperado:
   - Jan-Abr: ~ valores anteriores (gap nesses meses já é puxado para Dez).
   - Mai: ainda baixo (~134) porque não há Oxy de Abr/26 ainda → gap de Abr não computado nesse momento.
   - Dez: significativamente inflado (recebe o gap acumulado de Jan-Mar, e à medida que Oxy de Abr/Mai chegar, automaticamente cresce mais).
   - Soma anual `faturamento_vender + mrr_base_planejamento` ≈ meta anual da BU.

---

## Detalhes técnicos

**Arquivo único alterado**: `src/hooks/usePlanGrowthData.ts`
- Novo `useMemo` `gapMrrModeloAtual` (depende de `mrrDynamic.mrrPorMes` + `mrrBaseRealPorMes`).
- Novo `useMemo` `mrrDynamicAdjusted` que clona `mrrDynamic` e ajusta `revenueToSell['Dez']` + `vendasPorMes['Dez']`.
- Trocar `mrrDynamic` → `mrrDynamicAdjusted` em `modeloAtualFunnelCalculated` (linha 462-468).

**Fonte de verdade Oxy** (já existe): `mrrBaseRealPorMes[m] = mrr_base_monthly[m-1]`.

**Comportamento esperado por mês fechado**: à medida que novos meses caírem em `mrr_base_monthly`, o gap é recalculado e Dez se ajusta automaticamente — sem nova migração.

**Sem impacto em outras BUs**: cálculo isolado dentro do bloco Modelo Atual.

**Reversão**: restaurar `funnel_metas` do CSV de backup via UPSERT e reverter o commit do hook.
