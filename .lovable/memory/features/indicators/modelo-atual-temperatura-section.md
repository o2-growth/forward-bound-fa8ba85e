---
name: Modelo Atual · Temperatura dos Leads
description: Seção de drill-down de tags Quente/Morno/Frio abaixo dos acelerômetros monetários, apenas Modelo Atual
type: feature
---
Componente `TemperaturaSection` (em `src/components/planning/indicators/`) consome `modeloAtualAnalyticsRaw.allCards` e mostra 3 chips clicáveis (Quente/Morno/Frio). Aparece logo abaixo dos acelerômetros monetários no IndicatorsTab, só quando `selectedBUs` inclui `modelo_atual`. Esconde quando nenhum card no período tem tag.

Fonte dos dados (pipefy_moviment_cfos):
- Coluna `Labels` (texto simples) — prioridade 1
- Coluna `Prioridade Lead` (JSON array string `["Quente"]`) — prioridade 2
- Coluna `Prioridade do Lead` (legado) — prioridade 3

`parseTemperatura(row)` (exportada de `useModeloAtualAnalytics.ts`) normaliza tudo para `Quente | Morno | Frio` (Fria→Frio, Morna→Morno).

Dedup: 1 entrada por `card.id` mantendo a movimentação mais recente do período. Clique no chip abre `DetailSheet` com empresa/fase/closer/SDR/MRR/faixa/data.
