## Objetivo
Marcar 4 cards específicos como **Quente** na aba de temperatura do dashboard comercial (`TemperaturaSection`), independente do que o Pipefy retorna no campo `Labels`/`Prioridade Lead`.

Cards: **BAFFS, FROMTHERM, VIGA, ESPOLIO CARPENA**.

## Como vai funcionar
A aba "Temperatura dos Leads" lê `card.temperatura` direto do `ModeloAtualCard`. Vou forçar `temperatura = 'Quente'` para esses títulos no hook, então eles aparecem automaticamente no bucket Quente da aba sem mudar nenhum componente de UI.

## Mudança

**Arquivo:** `src/hooks/useModeloAtualAnalytics.ts`

1. Adicionar constante com os 4 títulos (normalizados — lowercase + sem acento):
   ```ts
   const FORCED_QUENTE_TITLES = new Set([
     'baffs', 'fromtherm', 'viga', 'espolio carpena',
   ]);
   ```
2. Adicionar helper `normalizeTitle()` (NFD, trim, lowercase, remove diacríticos) — segue o padrão de `CARD_OVERRIDES_BY_TITLE` em `useExpansaoAnalytics.ts`.
3. Em `parseCardRow`, após calcular `parseTemperatura(row)`:
   - Se `normalizeTitle(titulo) ∈ FORCED_QUENTE_TITLES` → `temperatura = 'Quente'`.
   - Caso contrário, mantém o valor original.

Efeito imediato:
- `TemperaturaSection` (aba de tags do indicador comercial) passa a contar os 4 cards no chip 🔥 Quente e a listá-los no drawer.
- Como bônus zero-custo, eles também caem em `hotOpportunityItems` do `CommercialPaceDashboard`.

## Suposição
Os 4 cards estão no pipe **Modelo Atual (CaaS)**, que é a única BU cuja `TemperaturaSection` exibe. Se algum estiver em O2 TAX ou Expansão, vou estender o override para esses hooks também numa segunda rodada — me avise se isso acontecer.

## Fora de escopo
Nenhuma mudança em UI, tabelas de drill-down, banco de dados ou outras BUs nesta passagem.
