
## Objetivo
No Dashboard G4, restringir as **vendas (Ganho)** para mostrar **apenas** os cards do relatório de Finders Fee (print do Excel). Todo resto continua como está (leads, MQL, funil por live).

## Whitelist oficial (do print)
E-mails que devem contar como venda G4:

- vanderson@martinelli.ind.br — Martinelli
- sidney@petromarcomercial.com.br — Sidney/Petromar
- joaopaulo@jpprojetos.com — João Paulo Gomes
- fabrizio.mazza@discabos.com.br — Fabrizio Mazza
- tamara@importadorapatagonia.com.br — Stillus Home
- tchauentrega@gmail.com — Tchau Entrega
- yurijosect@gmail.com — B2G Vix
- administrativo@lotuslogistica.com — Lotus Logística
- andre.silva@invenzi.com — Invenzi

## Situação atual (medida via `g4-metrics`)
Aparecem hoje como Ganho no dash: Fabrizio, João Paulo, Tchau Entrega, B2G Vix (✅ do print) **+** Fauhome, Spa Med, Ediouro, CAPTABLE (⚠️ fora do print).

Não aparecem no dash apesar de estarem no print: Martinelli, Sidney/Petromar, Stillus Home, Lotus Logística, Invenzi.

## Mudanças

### 1. `supabase/functions/g4-metrics/index.ts`
- Definir `const G4_SALES_WHITELIST_EMAILS` com os 9 e-mails acima (lowercase).
- No cálculo do **KPI `faturamento`**: restringir a soma aos cards cujo `lower("E-mail")` esteja na whitelist (mantém `Fase Atual = 'Ganho'`).
- Na consulta do **funil por live** (coluna `vendas`): idem — só conta como venda se o e-mail estiver na whitelist.
- Para os e-mails da whitelist que hoje não aparecem em `g4_leads_360` (Martinelli, Sidney, Stillus, Lotus, Invenzi), adicionar um `UNION` na CTE de leads puxando direto de `pipefy_moviment_cfos` (por e-mail), para que apareçam no drill-down de vendas com nome, empresa, valores, closer e link Pipefy.

### 2. `src/components/planning/g4/G4ConsolidatedDashboard.tsx`
- Adicionar constante `G4_SALES_WHITELIST_EMAILS` (mesma lista) como guarda no front.
- No cálculo de `vendas`, `faturamento`, `mrr/setup/pontual/tcv/ticket` derivados de leads: filtrar `faseAtual === 'Ganho'` **E** `whitelist.has(email)`.
- Drill-downs "Fechados", "MRR", "Setup", "Pontual", "TCV", "Ticket": mesma restrição.
- KPIs "Leads", "MQL", "Em contato", "Quentes", "Perdidos" e o funil por live **não mudam** (só a coluna/valor de venda).

### 3. Sem migrações, sem mudanças em outras abas.

## Perguntas
1. **Sidney/Petromar** aparece no print com canal "Comercial-Escuta-Ativa" (não G4). Você quer mesmo contar como venda G4? Se sim, mantenho na whitelist; se não, removo.
2. Confirma que **Fauhome, Spa Med, Ediouro e CAPTABLE** devem sair das vendas do dash (ainda que Fauhome tenha live G4 real)?
