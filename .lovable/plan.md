## Causa encontrada

A Petromar já está corretamente no bucket "G4 - Finders Fee (fora das lives)" (verifiquei no payload da função `g4-metrics`: `lives: ["G4 - Finders Fee (fora das lives)"]`).

O problema está na classificação do bucket: em `computeGroup`, o grupo é classificado por `classifyG4Event(live)`. Como o rótulo **"G4 - Finders Fee (fora das lives)"** contém a palavra "lives", a regra de nome cai em `categoria: "Live"` e o grupo recebe `kind: "live"`.

Resultado: ao usar o filtro Live/Evento (`kind`), o grupo Finders Fee passa no filtro "Live" e a Petromar volta a aparecer nos KPIs.

## Correção

1. Em `G4ConsolidatedDashboard.tsx`, marcar o bucket Finders Fee explicitamente:
   - em `computeGroup`, se `live === FINDERS_FEE_LABEL`, forçar `kind: "finders"` (novo valor no tipo) e `categoria` fora da árvore, sem passar por `classifyG4Event`.
2. No `useMemo` de `groups`, o filtro `if (kind !== "todos" && g.kind !== kind) continue;` passa a nunca deixar o grupo Finders Fee entrar quando o filtro for "live" ou "evento" — ele só existe na sua própria seção.
3. Manter a seção Finders Fee sempre visível/independente (com seus próprios totais e drill-down), respeitando apenas o filtro de data (fallback por `dataEntradaPipe`, como hoje).
4. Como o Finders Fee sai dos grupos filtrados, os KPIs de topo deixam de somá-lo quando o filtro Live/Evento está ativo — que é o comportamento pedido.

## Verificação

- Filtro "Live": Petromar não aparece em nenhum KPI nem no drill-down.
- Filtro "Todos": números totais continuam iguais aos de hoje (Finders Fee somado uma única vez).
- Bloco Finders Fee: continua mostrando os 9 clientes com TCV correto.
