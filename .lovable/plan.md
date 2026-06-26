## Objetivo

Tratar o **Funil de Monetização** (pipe `pipefy_moviment_contrato` — Upsell, Cross-sell, Troca de produto, Downsell) como uma **nova origem** no Indicador Comercial, ao lado de Inbound / Outbound / Eventos / Indicação / Sem origem. Os movimentos passam a somar nos aceler­ômetros e nos gauges monetários quando a origem "Monetização" estiver selecionada (ou quando nenhuma origem estiver filtrada — comportamento de "todas").

## Como vai aparecer na UI

- Novo chip no MultiSelect "Origem" da aba Comercial: **"Monetização"** (junto de Inbound, Outbound, Eventos, Indicação, Sem origem).
- Sem mexer no filtro de BUs (Modelo Atual / O2 TAX / Oxy Hacker / Franquia continuam como estão). Monetização é transversal — não é uma BU.
- Todos os drill-downs (clique em MQL / Proposta / Venda / MRR / Setup / Pontual) passam a listar também os cards de monetização atribuídos àquela fase / período, com a coluna "Tipo" mostrando Upsell / Cross-sell / Troca de produto / Downsell e a coluna "BU" como "Monetização".

## Mapeamento de fases sugerido (pipe não tem reunião)

| Acelerômetro | Fases do pipe Monetização que contam |
|---|---|
| MQL | — (pipe não tem MQL) |
| Reunião Agendada (RM) | — |
| Reunião Realizada (RR) | — |
| **Proposta enviada** | `Proposta em Elaboração` + `Proposta enviada / Follow Up` |
| **Venda** | `Aprovado pelo Cliente` + `Jurídico` + `Faturamento` + `Concluído` |

Justificativa: o funil parte direto de "Oportunidade Levantada", então não há etapas equivalentes a MQL/RM/RR. Contabilizar do estágio de proposta em diante garante que upsell / cross-sell apareçam em "Propostas Enviadas" e "Vendas" sem inflar topo de funil. Dedup de venda por card (1x por mês) continua valendo, igual às demais BUs.

## Filtro de tipo

Por padrão entram **todos os 4 tipos** (Upsell, Cross-sell, Troca de produto, Downsell) somados. No drill-down a coluna "Tipo" permite ao usuário distinguir visualmente.

## Valores monetários

Para cada card do pipe Monetização, derivar:
- **MRR** = `valor_cfoaas + valor_oxy + valor_assessoria_mrr + valor_bpo + valor_coordenador_financeiro`
- **Setup** = `valor_setup`
- **Pontual** = `valor_diagn_stico + valor_turnaround + valor_valuation`
- **Educação** = `valor_educa_o` (entra só no GMV, como hoje)

Esses valores somam nos gauges de MRR / Setup / Pontual / Fat Incremento da aba Comercial quando a venda cai dentro do período (usando data de Entrada da fase atual / data de assinatura quando disponível).

Reaproveita a regra "🔥 quente" que já existe (`temperaturaAggregator`) — sem mudança lá.

## Detalhes técnicos

**1. `src/lib/leadSource.ts`**
- Adicionar `'monetizacao'` ao tipo `LeadSource` e ao `LEAD_SOURCE_LABELS` (label: "Monetização").
- Nova regra no topo do `classifyLeadSource`: se `tipoOrigem === '__monetizacao__'` (sentinel) → retornar `'monetizacao'`. Mantém o resto da heurística intacta.

**2. `src/hooks/useMonetizacaoAnalytics.ts`**
- Expor uma função `toCommercialCards(): AttributionCard[]` que retorna os cards já no formato esperado por `IndicatorsTab` (com `tipoOrigem: '__monetizacao__'`, `bu: 'monetizacao'`, `fase` mapeada para a fase comercial equivalente — `proposta` ou `venda` — e `valorMRR / valorSetup / valorPontual` calculados pela regra acima).
- Exportar também `getDetailItemsForIndicator(indicator, start, end)` análogo ao que `useExpansaoMetas` já faz, para alimentar drill-downs.

**3. `src/components/planning/IndicatorsTab.tsx`**
- Importar `useMonetizacaoAnalytics` (já está importado para a seção dedicada — só reaproveitar a instância via contexto/hook).
- Adicionar `{ value: 'monetizacao', label: LEAD_SOURCE_LABELS.monetizacao }` no MultiSelect de Origem (linha ~3108).
- No agregador que monta `allCards` para os aceler­ômetros (MQL / RM / RR / Proposta / Venda), concatenar `monetizacao.toCommercialCards()` filtrados pelo período. `matchesOrigemFilter` já passa a funcionar automaticamente porque o classifier devolve `'monetizacao'`.
- Nos somatórios monetários (MRR / Setup / Pontual / Fat Incremento), incluir os cards de Monetização do período. Pular MQL/RM/RR (pipe não gera esses estágios).
- Drill-down: estender o roteador de `getDetailItemsForIndicator` para concatenar resultados de monetização quando origem incluir `monetizacao` (ou estiver vazia).

**4. Mapeamento de fase para `IndicatorType`**
Função utilitária pequena dentro de `useMonetizacaoAnalytics`:
```text
'Proposta em Elaboração'         → 'proposta'
'Proposta enviada / Follow Up'   → 'proposta'
'Aprovado pelo Cliente'          → 'venda'
'Jurídico'                       → 'venda'
'Faturamento'                    → 'venda'
'Concluído'                      → 'venda'
demais                           → ignorar (não conta)
```

**5. Sem mudanças**
- `MonetizacaoSection.tsx` (seção dedicada continua exibindo o funil completo, independente da origem).
- `temperaturaAggregator.ts` (já consome o pipe e marca Upsell/Cross/Troca como Quente).
- BUs, metas, redistribuição, lock — nada disso muda.

## Validação

1. Sem filtro de origem: totais de Proposta e Venda nos aceler­ômetros sobem em relação a hoje pela quantidade de cards de monetização no período. MRR/Setup/Pontual sobem proporcionalmente aos valores do pipe.
2. Filtrando origem = **Monetização**: aceler­ômetros mostram só os cards do pipe; gauges monetários mostram só os valores deles; MQL/RM/RR ficam zerados (esperado).
3. Filtrando origem = **Inbound**: comportamento atual preservado (cards de monetização somem dos totais).
4. Drill-down de Proposta/Venda lista cards de monetização com coluna Tipo e link Pipefy correto.