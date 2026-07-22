## Problema

No dashboard consolidado do G4, o mesmo evento aparece em várias linhas por causa de variações no nome vindas do CRM. Exemplos citados:

- `Live G4 - 02/07/2026`, `Live - G4 02/07`, `Live - G4` → mesma live 02/07
- `G4-Aula-Traction-02/07/2026` → evento distinto no mesmo dia
- `G4-Aula-Traction-08/07/2026` → evento distinto em outra data

Hoje só existem 2 mapeamentos hardcoded em `LIVE_CANONICAL_MAP` (20/05 e 21/05); tudo mais é agrupado pelo nome cru, gerando duplicatas.

## Solução

Substituir o `canonLive` puramente por lookup por uma função de canonicalização automática em `src/components/planning/g4/G4ConsolidatedDashboard.tsx` (e replicar em `G4RealSection.tsx` para consistência):

1. **Detectar tipo do evento** a partir do nome normalizado:
   - `live` → contém "live"
   - `aula-traction` → contém "aula" + "traction"
   - `aula` → contém "aula"
   - `evento` → fallback

2. **Detectar data** reutilizando `parseEventDate` (já aceita `dd/mm/aaaa`, `dd/mm`, `dd-mmm`).

3. **Gerar rótulo canônico** no formato:
   - Com data: `Live G4 · 02/07/2026`, `Aula Traction · 08/07/2026`
   - Sem data: manter nome original (evita colapsar eventos genuinamente diferentes)

4. **Manter overrides manuais** (LIVE_CANONICAL_MAP) para casos que a heurística não pega, com prioridade sobre o auto.

5. **Diagnóstico**: rodar a heurística uma vez sobre `leads` e logar (só em dev) qualquer grupo canônico que agregue >1 nome cru distinto, para facilitar auditoria futura.

## Impacto

- Todas as variações "Live - G4 02/07", "Live - G4 - 02/07/2026", "Live G4 02-jul" etc. passam a somar num único card.
- `Aula Traction 02/07` continua separada da `Live 02/07` (kinds diferentes), como esperado.
- Ordenação, drill-down, tabela e gráficos (Top 5 TCV, Volume por live/evento) refletem os grupos consolidados.
- Nenhuma mudança em dados no banco nem em outras abas.

## Arquivos

- `src/components/planning/g4/G4ConsolidatedDashboard.tsx` — nova função `canonLive` heurística + `parseEventDate` reutilizado.
- `src/components/planning/g4/G4RealSection.tsx` — mesma função para manter tabela real coerente.
