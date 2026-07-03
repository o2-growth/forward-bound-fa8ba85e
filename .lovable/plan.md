# Ajuste na Temperatura dos Leads

## Objetivo
Fazer os chips 🔥 Quente / 🌤 Morno / ❄ Frio refletirem **todo o pipeline vivo** com tag de temperatura, independente do período selecionado — mesmo comportamento já usado no Cenário de Caixa.

Hoje o `TemperaturaSection` chama `aggregateByTemperatura` sem a flag `includeAllOpenIgnoringPeriod`, então cards que não tiveram movimentação no período somem dos chips mesmo estando abertos e marcados como Quente/Morno/Frio.

## Mudanças

### 1. `src/components/planning/indicators/TemperaturaSection.tsx`
- Passar `includeAllOpenIgnoringPeriod: true` no `aggregateByTemperatura`.
- Atualizar o texto do `CardHeader` para deixar claro que o escopo é o pipeline aberto atual (não o período), evitando confusão com os outros indicadores comerciais que ainda respeitam o filtro.
  - Ex.: "Cards abertos no pipeline (independente do período selecionado) com tag de prioridade..."
- Manter o `useMemo` dependendo de `startDate/endDate` só por consistência das fontes de dados (os hooks continuam refazendo fetch quando o período muda).

### 2. Reaproveitamento do que já existe
- Nenhuma mudança em `temperaturaAggregator.ts`: a flag `includeAllOpenIgnoringPeriod` e o uso de `allOpenCards` de Modelo Atual / Franquia / Oxy Hacker já estão implementados.
- Outbound e Monetização já entram corretamente sob a flag (Outbound usa `allCards`, Monetização respeita a flag para não exigir `entrada` no período).
- Exclusão de fases Perdido / Ganho continua ativa — cards fechados não poluem os chips.

## Detalhes técnicos
- Comportamento após a mudança:
  - Chip **Quente/Morno/Frio** = todos os cards abertos hoje com aquela tag, nas BUs selecionadas.
  - Total "taggeado" e "sem tag" também deixam de variar com o período (passam a refletir o pipeline vivo).
  - Monetização (Upsell / Cross-sell / Troca de produto) continua entrando como 🔥 Quente por regra.
- Filtro de BUs (`selectedBUs`) continua sendo respeitado normalmente.

## Validação
- Trocar o período no dashboard e confirmar que a contagem dos chips **não muda**.
- Abrir cada chip e verificar que aparecem cards com movimentação anterior ao período (ex.: cards do mês passado ainda abertos).
- Conferir que cards em fases Perdido/Ganho/Contrato assinado continuam fora.
- Conferir que ao desmarcar uma BU os cards dela somem dos chips.
