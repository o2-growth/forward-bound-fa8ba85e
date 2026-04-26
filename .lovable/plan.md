## Problema

No **Card Investigator**, fases com acento (`Reunião agendada / Qualificado`, `Reunião Realizada`, `Proposta enviada / Follow Up`, `1° Reunião Realizada - Apresentação`) **não são reconhecidas** porque os mapas `MA_PHASE_TO_INDICATOR` e `EXP_PHASE_TO_INDICATOR` usam chaves sem acento (`Reuniao`, `Realizada`, `Apresentacao`).

O lookup `ALL_PHASE_TO_INDICATOR[m.fase]` é uma comparação exata de string, então o Pipefy retornando `"Reunião agendada / Qualificado"` (com til) **não bate** com a chave `"Reuniao agendada / Qualificado"` (sem til). Resultado: RM e RR aparecem como "Sem movimento" mesmo quando existem.

Isso afeta **apenas o diagnóstico do CardInvestigator** — os widgets reais (`useModeloAtualAnalytics`, etc.) já usam `normalizeStr` e funcionam corretamente.

## Correção

Em `src/components/planning/indicators/CardInvestigator.tsx`, trocar o lookup direto por um lookup **normalizado** (trim + lowercase + remove acentos), reutilizando a função `normalizeStr` que já existe no arquivo.

### Passos

1. Construir um `NORMALIZED_PHASE_TO_INDICATOR` derivado de `ALL_PHASE_TO_INDICATOR`, com chaves passadas por `normalizeStr`.
2. Criar um helper `getIndicatorForPhase(fase: string)` que faz `NORMALIZED_PHASE_TO_INDICATOR[normalizeStr(fase)]`.
3. Substituir todas as 4 ocorrências de `ALL_PHASE_TO_INDICATOR[m.fase]` (em `buildDiagnostics` e no JSX da timeline) por `getIndicatorForPhase(m.fase)`.
4. Mesma troca para a deduplicação de `unmappedPhases` (usar o helper).

### Resultado esperado

Para o card `1338671728` (sem título, Modelo Atual):
- Linha `19/abr — Reunião agendada / Qualificado` passa a marcar **RM abr/26**.
- Linha `23/abr — Reunião Realizada` passa a marcar **RR abr/26**.
- Diagnóstico de RM e RR muda de "NAO — Sem movimento" para "SIM (abr/26) — Entrada 19/abr" e "SIM (abr/26) — Entrada 23/abr".

Nenhuma mudança em outros componentes ou no banco.