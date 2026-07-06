# Fix da divergência Funil do Período × Aceleradores

## Diagnóstico atual

Comparando o print atual (Consolidado, 01–06/07/2026, sem filtros):

| Indicador | Aceleradores | Funil do Período | Δ |
|---|---:|---:|---:|
| MQL | 41 | 34 | +7 |
| RM (Reun. Ag.) | 28 | 22 | +6 |
| RR (Reun. Real.) | 19 | 18 | +1 |
| Proposta | 11 | 11 | 0 |
| Venda | 5 | 4 | +1 |

Comparando os dois caminhos no código:

- **Aceleradores** (`getRealizedForIndicator` em `IndicatorsTab.tsx` linhas 1203–1336): sem filtro ativo, usa `getCardsForIndicator(k).length` para Modelo Atual e `getDetailItemsForIndicator(k).length` para O2 TAX / Oxy / Franquia. Para Proposta/Venda no Consolidado, soma Monetização.
- **Funil do Período** (`ClickableFunnelChart.tsx` linhas 151–228): sem filtro ativo, faz o mesmo — porém com duas exceções: (1) para O2 TAX MQL usa `o2TaxAnalytics.getMqlsByRevenue.flatMap(cards)` em vez de `getDetailItemsForIndicator('mql')`; (2) roda um `filter(matchCardCloser && matchCardSdr && matchCardOrigem)` mesmo quando não há filtro selecionado.

Sem filtros ativos, os helpers de match retornam `true` por curto-circuito, então em tese as duas fontes deveriam bater. As logs do console (`getCardsForIndicator mql (by creation): 334 cards`, `rm: 123 → 118`) mostram que as funções são invocadas várias vezes (uma vez por instância de hook: gauge, gráficos, weekly, funil), o que dificulta ver qual chamada alimenta cada área.

## Plano

1. **Instrumentar** temporariamente com logs marcados:
   - Em `getRealizedForIndicator` (IndicatorsTab): logar `{key, ma, o2, oxy, franq, monet, total}` como `[GAUGE-DEBUG]`.
   - Em `ClickableFunnelChart` (após `totals`): logar `{key, ma, o2, oxy, franq, monet, total}` como `[FUNNEL-DEBUG]`.
2. **Reproduzir** via Playwright autenticado: abrir Indicadores no período 01–06/07/2026, sem filtros, capturar console filtrando por `[GAUGE-DEBUG]` e `[FUNNEL-DEBUG]` para MQL/RM/RR/Prop/Venda. Comparar por BU para localizar exatamente onde diverge (Modelo Atual? O2 TAX? Oxy? Franquia? Monet?).
3. **Corrigir** a causa raiz — provavelmente uma das seguintes, já mapeadas:
   - **O2 TAX MQL**: alinhar Funil e Gauge para usarem a mesma fonte (`getDetailItemsForIndicator('mql')` ou ambos `getMqlsByRevenue`). Escolha depende de qual é a definição correta hoje.
   - **Filtros silenciosos no Funil**: se algum `matchCardOrigem` está retornando `false` para cards sem `origemLead` mesmo com "Todas Origens" (bug de defaults), ajustar o helper para não excluir cards sem origem quando não há filtro.
   - **Deduplicação diferente entre `getCardsForIndicator` e `getDetailItemsForIndicator`**: unificar a fonte usada pelo Funil e pelo Gauge para o mesmo indicador na mesma BU.
4. **Validar**: rodar Playwright de novo, confirmar que Gauge e Funil batem MQL, RM, RR, Proposta e Venda no mesmo período; testar também com filtros de closer/BU para garantir que não quebrei o caminho filtrado.
5. **Remover** os logs `[GAUGE-DEBUG]` / `[FUNNEL-DEBUG]`.

Sem mudança de dados — só código.
