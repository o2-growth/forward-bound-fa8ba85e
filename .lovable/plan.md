## Diagnóstico atual (com números novos)

| | Funil | Acel | Δ |
|---|---|---|---|
| MQL | 34 | 41 | +7 |
| RM | 22 | 28 | +6 |
| RR | 18 | 19 | +1 |
| Proposta | 11 | 11 | ✅ 0 |
| Venda | 4 | 5 | +1 |

Logs mostram Modelo Atual 29/20/10/6/2 e O2 TAX 0. Proposta bateu (11=11) → Monetização integrada no funil funcionou. Sobra o gap Oxy+Franquia em MQL/RM/RR/Venda:

- Funil Oxy+Franquia (analytics): MQL=5, RM=2, RR=8, Venda=0(+monet 2) 
- Acel Oxy+Franquia: MQL=12, RM=8, RR=9, Venda=2(+monet 1)

Mesmo o código chamando `getDetailItemsForIndicator` em ambos os lados (mesmo hook, mesmo `useExpansaoAnalytics(startDate, endDate, ...)`), os números divergem. Isso é impossível se as duas instâncias do hook receberem exatamente os mesmos parâmetros — então ou os parâmetros diferem, ou algum outro branch está somando itens que não vi.

## Plano

### Passo 1 — Instrumentar
Adicionar `console.log` temporário nos dois lados imprimindo, para o consolidado sem filtro, o resultado por BU e por indicador:

Em `IndicatorsTab.getRealizedForIndicator` (após cada `total +=`):
```
console.log(`[ACEL ${indicator.key}] +MA=${maCount} +O2=${o2Count} +Oxy=${oxyCount} +Franq=${franqCount} +Monet=${monetCount} = ${total}`)
```

Em `ClickableFunnelChart` (após cálculo de `totals`):
```
console.log('[FUNIL totals]', totals, 'MA:', getFilteredModeloAtualQty('mql'), 'O2:', getO2TaxAnalyticsQty('mql'), 'Oxy:', getOxyHackerAnalyticsQty('mql'), 'Franq:', getFranquiaAnalyticsQty('mql'))
```

Idem para RM/RR/venda.

### Passo 2 — Comparar
Peço para você abrir o Console do navegador (F12 → Console) e me mandar as duas linhas. Aí eu identifico exatamente qual BU/indicador está com contagem diferente e a causa (dedup, filtro extra, hook duplicado, etc).

### Passo 3 — Corrigir
Com a causa identificada, aplico o fix definitivo (provavelmente unificar as duas chamadas em um helper compartilhado, evitando drift).

### Passo 4 — Remover os logs
Depois de confirmar que bate.

### Detalhes técnicos
Arquivos tocados: `src/components/planning/IndicatorsTab.tsx`, `src/components/planning/ClickableFunnelChart.tsx`. Apenas `console.log`s adicionados/removidos. Nenhuma mudança de lógica no Passo 1.
