## Causa raiz confirmada

Banco e Pipefy estão corretos. Card `1403404371` (e demais Expansão) têm `Closer responsável` preenchido em todas as movimentações (verificado via `pipefy_cards_movements_expansao`).

O problema está em `src/hooks/useExpansaoMetas.ts`, função `getDetailItemsForIndicator` (linhas 426–480): ela devolve itens com `closer: ''` e `responsible: ''` fixos — não lê nem propaga o Closer/SDR do banco.

Em `IndicatorsTab.tsx`, quando não há filtro de closer/SDR/origem ativo, o `getItemsForIndicator` usa justamente esse `getExpansaoDetailItems`. Como `itemsByIndicator` alimenta a `CloserPerformanceMatrix`, todo card de Franquia/Oxy Hacker chega com closer vazio e cai em "Sem Closer". Nada a ver com Bruna nem com fallback.

## Correção (sem fallback, sem hardcode)

Popular closer/SDR reais nos itens do caminho "sem filtro" usando os dados que os hooks de analytics já buscam do banco.

**Arquivo:** `src/components/planning/IndicatorsTab.tsx`, dentro de `getItemsForIndicator`.

1. Nos blocos de Franquia e Oxy Hacker, no ramo `else` (sem filtro), após obter `franquiaItems` / `oxyItems` do `getExpansaoDetailItems`/`getOxyHackerDetailItems`, montar um `Map<id, { closer, sdr, responsible }>` a partir de `franquiaAnalytics.cards` / `oxyHackerAnalytics.cards` (esses `cards` já vêm com `Closer responsável` e `SDR responsável` do banco).
2. Fazer `.map` nos itens injetando `closer`, `sdr` e `responsible` quando o `id` bate no Map. Se um item não estiver no Map (raro, ex.: item veio de meta sem card correspondente), mantém como está.
3. Nada muda em contagens, valores, gauges ou no ramo "com filtro".

Escopo total: ~15 linhas em 1 arquivo. Zero mudança em hooks, banco ou lógica de metas.

## Validação

- Abrir matriz de closers em Consolidado, sem nenhum filtro: cards de Franquia/Oxy Hacker aparecem sob o closer real do banco (Bruna Patricio Mota, etc.), não mais em "Sem Closer".
- Card `1403404371` deve aparecer na coluna Bruna, faixa correspondente.
- Totais do acelerômetro seguem batendo com a matriz (nenhuma contagem foi alterada).
- Modelo Atual e O2 TAX seguem idênticos.
