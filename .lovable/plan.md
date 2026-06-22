## Contexto

Hoje `TemperaturaSection` lê apenas `useModeloAtualAnalytics` (cada card tem o campo `temperatura` parseado de `Labels / Prioridade Lead`). Os pipes de Expansão (Franquia, Oxy Hacker) e Outbound têm os mesmos labels no Pipefy, mas seus hooks não parseiam o campo, então a seção ignora esses cards.

## O que vai mudar

1. **Parse de temperatura nas demais BUs**
   - `useExpansaoAnalytics.ts`: adicionar campo `temperatura?: 'Quente' | 'Morno' | 'Frio'` em `ExpansaoCard` e popular via `parseTemperatura` (importada de `useModeloAtualAnalytics`). Incluir também no objeto retornado pelo `toDetailItem` interno (se já existir; caso contrário criar wrapper local na seção).
   - `useOutboundAnalytics.ts`: popular `temperatura` em `parseOutboundRow` (o tipo `ModeloAtualCard` já aceita).
   - Não mexer em `useO2TaxAnalytics` (não está no escopo aprovado).

2. **`TemperaturaSection` aceitar múltiplas fontes e respeitar filtro de BU**
   - Nova assinatura:
     ```ts
     {
       modeloAtualAnalytics, expansaoFranquiaAnalytics,
       expansaoOxyAnalytics, outboundAnalytics,
       selectedBUs, startDate, endDate
     }
     ```
   - Regras de inclusão (mapeando filtro do dashboard → fontes):
     - `modelo_atual` ∈ selectedBUs → inclui Modelo Atual
     - `franquia` ∈ selectedBUs → inclui Expansão Franquia
     - `oxy_hacker` ∈ selectedBUs → inclui Expansão Oxy Hacker
     - Outbound entra sempre que `modelo_atual` estiver selecionado (origem do pipe outbound alimenta o funil de Modelo Atual hoje). Sem checkbox extra.
   - Agregação única por temperatura (um chip Quente / Morno / Frio somando todas as fontes ativas), conforme opção escolhida ("Respeitar filtro de BU do dashboard").
   - Dedup por `id` mantendo a entrada mais recente, igual à lógica atual, mas por fonte (IDs podem colidir entre pipes — prefixar com origem ao deduplicar).
   - Drill-down (`DetailSheet`): adicionar coluna **BU** mostrando `Modelo Atual` / `Franquia` / `Oxy Hacker` / `Outbound` para que o usuário saiba de onde veio cada card. Demais colunas mantidas.
   - Título passa de "🌡 Temperatura dos Leads · Modelo Atual" para "🌡 Temperatura dos Leads" + subtítulo dinâmico listando BUs incluídas.

3. **`IndicatorsTab.tsx`**
   - Remover o guard `selectedBUs.includes('modelo_atual') && <TemperaturaSection ...>` e passar as 4 analytics + `selectedBUs`. O próprio componente decide se renderiza (retorna `null` se nenhuma fonte ativa tem cards taggeados).

## Critérios de aceite

- Com filtro padrão (todas as BUs), o card Temperatura mostra contagem somada de Modelo Atual + Franquia + Oxy Hacker + Outbound.
- Ao filtrar somente "Franquia", apenas cards Franquia aparecem (Outbound só aparece se Modelo Atual estiver selecionado).
- Drill-down exibe coluna BU correta para cada linha.
- Contadores "Total taggeado" / "Sem tag" refletem o universo combinado das fontes ativas.

## Arquivos afetados

- `src/hooks/useExpansaoAnalytics.ts`
- `src/hooks/useOutboundAnalytics.ts`
- `src/components/planning/indicators/TemperaturaSection.tsx`
- `src/components/planning/IndicatorsTab.tsx` (apenas a chamada do componente)
