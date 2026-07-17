# Temperatura dos Leads — aplicar filtros globais (exceto data)

## Objetivo
Hoje a seção "🌡 Temperatura dos Leads" (aba Indicadores › Comercial) só respeita o filtro de **BU**. Passará a respeitar também **Closer**, **SDR** e **Origem/Canal**, continuando a ignorar apenas o filtro de **período** (para manter a visão de pipeline vivo).

## Escopo
- Arquivo principal: `src/components/planning/indicators/TemperaturaSection.tsx`
- Aggregator: `src/components/planning/indicators/temperaturaAggregator.ts`
- Nenhuma alteração em outras seções, hooks de analytics ou banco.

## Mudanças

### 1. `TemperaturaSection` recebe os filtros ativos
Adicionar props opcionais: `selectedClosers`, `selectedSdrs`, `selectedOrigens` (mesmos tipos já usados no `IndicatorsTab`). O `IndicatorsTab` passa esses arrays ao renderizar `<TemperaturaSection ... />`.

### 2. Filtragem por card no aggregator
Em `aggregateByTemperatura`, após montar `latestById` e antes de empurrar para `buckets`, aplicar (quando o filtro estiver preenchido):

- **Closer**: comparar com `card.closer` (case-insensitive, partial match — mesma regra do `matchesCloserFilter` do IndicatorsTab). Para Franquia/Oxy Hacker o fallback "Bruna" já vem resolvido no hook, então funciona nativamente.
- **SDR**: comparar com `card.sdr` (mesma regra).
- **Origem/Canal**: classificar o card via `classifyLeadSource(...)` (já usado no `bucketsWithCanal`) e checar inclusão em `selectedOrigens`.

Cards de **Monetização** seguem a mesma lógica; se o filtro de origem estiver ativo e não incluir "Monetização", eles saem.

### 3. Rótulo do escopo
O texto "Escopo atual: …" passa a listar também os filtros aplicados (ex.: "Modelo Atual + Franquia · Closer: Bruna · Canal: Inbound"), só para deixar claro para o usuário o que está filtrando.

## Fora de escopo
- Filtro de período continua ignorado (proposital — pipeline em aberto).
- Nenhuma mudança nos cálculos de Cenário de Caixa (que já consome o mesmo aggregator com `includeAllOpenIgnoringPeriod`). Se você quiser que o Cenário de Caixa **também** respeite Closer/SDR/Origem, me diga que eu incluo — hoje minha proposta é aplicar só na Temperatura dos Leads, como você pediu.

## Validação
- Sem filtros: contagens idênticas às atuais.
- Filtro Closer = Bruna: só Quente/Morno/Frio de cards cujo closer resolvido é Bruna.
- Filtro Canal = Inbound: só cards classificados como Inbound.
- Combinar BU + Closer + Canal: interseção.
