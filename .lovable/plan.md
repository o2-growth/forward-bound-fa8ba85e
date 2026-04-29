## Objetivo
Nos gauges radiais do acelerômetro (MQLs, Reuniões Agendadas, Realizadas, Propostas, Vendas, SLA, Fat Incremento, MRR, Setup, Pontual), pintar de **verde quando o percentual atingir ≥ 90%** da meta — em vez de só a partir de 100%.

## Comportamento atual
Em `src/components/planning/ClickableRadialCard.tsx`:
- `isAboveMeta = percentage >= 100`
- Se `isAboveMeta` → verde (`hsl(var(--chart-2))`), número % verde
- Caso contrário → vermelho (`hsl(var(--destructive))`)

## Mudança
Trocar o limiar para `>= 90`:
- `const isAboveMeta = percentage >= 90;`

Isso afeta tanto a cor do arco quanto a cor do texto de porcentagem, mantendo a regra unificada (≥90% = verde, <90% = vermelho). Nenhuma outra lógica/negócio é alterada.

## Arquivos
- `src/components/planning/ClickableRadialCard.tsx` (1 linha)

## Observação
O SLA é um caso invertido (quanto menor, melhor) — hoje ele já fica vermelho porque o "realizado" passa muito da meta de 30min, então a regra continua coerente com o comportamento atual; não há tratamento especial para SLA neste card genérico.
