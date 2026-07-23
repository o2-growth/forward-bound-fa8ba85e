## Objetivo
Remover leads/inscritos de teste de todas as métricas do dashboard G4 (público e interno) — inscritos, MQL, em contato, quentes, ganhos, perdidos, faturamento e drill-downs.

## Diagnóstico
Hoje o filtro anti-teste em `supabase/functions/g4-metrics/index.ts` é inconsistente:

- Funil por live e diagnóstico por live: filtram `email ILIKE '%teste%'`, `%exemplo.com%`, `%@o2inc.com.br` e uma lista curta.
- KPIs topo (`totalLeads`, `diagnosticos`): só filtra `total_leads` parcialmente; `diagnosticos` **não filtra nada**.
- Faturamento: **não filtra teste** — soma qualquer card ganho ligado a inscritos.
- Query de leads (a que alimenta o dashboard consolidado): só filtra `%teste%` e `%@o2inc.com.br`; não pega `nao_atender`, `TESTE ERP`, e-mails de exemplo curtos, nem cards de teste marcados só pelo **nome/empresa**.
- Front-end `G4ConsolidatedDashboard.tsx` não tem nenhuma exclusão de teste — depende 100% do que o edge devolve.

Resultado: inscritos e diagnósticos de teste continuam entrando na contagem.

## Escopo da mudança (só G4, sem tocar outras BUs)

### 1. `supabase/functions/g4-metrics/index.ts`
Centralizar em uma CTE `test_emails_lower` e uma expressão `is_test_name(...)` reutilizada por todas as 5 queries:

- **Padrões de e-mail bloqueados** (ILIKE): `%teste%`, `%test@%`, `%@test.%`, `%exemplo.com%`, `%@o2inc.com.br`, `%nao_atender%`, `%naoatender%`, `%no-reply%`, `%noreply%`.
- **Lista fixa** (já existente + novos): `dudarovani@gmail.com`, `jv241004@gmail.com`, `voce@empresa.com`, `demo@exemplo.com`, `teste_nao_atender@gmail.com`.
- **Padrões de nome/empresa/título** (ILIKE em `l.nome`, `l.empresa`, `pf."Nome"`, `pf."Empresa"`, `pf."Título"`): `%teste%`, `%nao atender%`, `%não atender%`, `%TESTE ERP%`, `%demo%` isolado (aplicado com cautela).

Aplicar em:
- Funil por live (`g4_inscritos` + join com pipe).
- Diagnóstico por live (`g4_diagnostico`).
- KPIs (`total_leads`, `levantaram_mao`, `diagnosticos`).
- Faturamento (inner join + filtro por card).
- Leads (query principal + UNION whitelist Finders Fee).

Whitelist Finders Fee tem precedência: e-mails da whitelist **nunca** são filtrados como teste.

### 2. `src/components/planning/g4/G4ConsolidatedDashboard.tsx`
Camada extra de segurança:

- Nova função `isTestLead(l: G4RealLead): boolean` — matcha e-mail / nome / empresa contra os mesmos padrões.
- `buildGroups` filtra `!isTestLead(l)` antes do resto (mantendo whitelist Finders Fee sempre dentro).
- KPI hint "Leads" atualizado para mostrar quantos foram excluídos por teste (junto com o hint atual de origem não-G4).

### 3. Deploy
Redeploy do `g4-metrics` após as alterações.

## Verificação
1. Chamar `g4-metrics` e conferir que e-mails com `teste`, `nao_atender`, nomes "Teste ERP" etc. sumiram de `leads`, `funil.inscritos` e `kpis.totalLeads`.
2. Abrir `/dash-g4` e conferir os totais no card "Volume por live/evento" (inscritos por live devem cair para os valores reais).
3. Whitelist Finders Fee (Martinelli, Sidney, etc.) segue aparecendo em "Ganho".

## Fora de escopo
- Não altera lógica das outras BUs (Modelo Atual, O2 TAX, Expansão, Outbound).
- Não altera whitelist Finders Fee nem exclusão manual de cards (Ediouro).
- Não mexe em `useModeloAtualMetas.ts` nem em outros hooks.
