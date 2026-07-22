## Diagnóstico
Cards como `1281298999` (CAPTABLE) e `1317180165` aparecem no Dashboard Consolidado do G4 porque seus e-mails estão em `g4_inscritos`. O view `g4_leads_360` faz LEFT JOIN por e-mail com o Pipefy e traz o card. Mas no Pipefy a origem real é indicação/colaborador — não G4.

Exemplo confirmado (card 1281298999): `Origem do lead = "Relacionamento Pedro Albite"`, `Tipo Origem Lead = "Colaborador O2"`.

## Regra proposta
Excluir do Dashboard Consolidado G4 (leads / MQLs / vendas / dinheiros) qualquer card cujo `Tipo Origem Lead` ou `Origem do lead` no Pipefy seja de canal não-G4:
- Colaborador O2 / Indicação
- Outbound / Prospecção ativa
- Relacionamento (quando marcado explicitamente)

Manter no G4 apenas quando houver sinal G4 real no lead:
- `levantou_mao = true`, OU
- `presente_alguma_live = true`, OU
- `fez_diagnostico = true`, OU
- `Origem do lead` / `Fonte` / `Campanha` no Pipefy mencionar G4 / Live / Aula Traction.

## O que muda

**Arquivo:** `supabase/functions/g4-metrics/index.ts`
1. No CTE `pipe`, incluir `p."Origem do lead"` e `p."Tipo Origem Lead"`.
2. No SELECT final, expor esses campos no payload de cada lead.

**Arquivo:** `src/hooks/useG4RealMetrics.ts`
- Adicionar os dois campos ao tipo `G4RealLead`.

**Arquivo:** `src/components/planning/g4/G4ConsolidatedDashboard.tsx`
1. Criar helper `isG4Attributed(lead)` com whitelist por sinal G4 + blacklist por origem indicação/colaborador/outbound.
2. Aplicar no `useMemo` que monta `groups` — leads que falharem saem de todos os KPIs, gráficos, tabela e drill-downs.
3. Adicionar contador auxiliar (tooltip do card "Inscritos") mostrando quantos inscritos foram excluídos por origem não-G4.

## Fora do escopo
- Não altera Indicadores Comerciais nem outras BUs.
- Não altera regras de MQL / Em contato / Quente / Ganho / Perdido.
- Não altera o `g4_leads_360` (view externa) — o filtro é aplicado do lado do dashboard.

## Validação
1. G4 › Dashboard Consolidado: confirmar que os cards `1281298999` (CAPTABLE) e `1317180165` sumiram dos totais e drill-downs.
2. Conferir contador de excluídos no tooltip do "Inscritos".
3. Confirmar que leads legítimos G4 (levantou mão / presente em live / diagnóstico) continuam aparecendo.