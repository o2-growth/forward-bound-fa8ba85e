## Problema

A venda **Lotus Logística** (card Pipefy `1398290148`, Ganho em 15/07/2026, MRR R$ 14.455,50) não aparece nas vendas do `/dash-g4`.

## Causa (verificada)

A whitelist Finders Fee usa `administrativo@lotuslogistica.com`, mas o e-mail real do card em `pipefy_moviment_cfos` é **`adm@lotuslogistica.com`** (tanto no campo "E-mail" quanto em "E-mail de quem assina"). Como não bate com nenhum e-mail da whitelist e provavelmente não tem `venda_atribuivel_live = true` em `g4_leads_360`, o `isG4Sale` retorna `false`.

## Correção

Adicionar `adm@lotuslogistica.com` à whitelist Finders Fee em dois lugares (mantendo o e-mail antigo por segurança):

1. `src/components/planning/g4/G4ConsolidatedDashboard.tsx` — set `G4_SALES_WHITELIST_EMAILS`.
2. `supabase/functions/g4-metrics/index.ts` — lista de e-mails no UNION da query de leads (linha ~296+). Redeployar a função.

Sem essa segunda inclusão o backend não retornaria a Lotus caso ela ainda não estivesse em `g4_leads_360`.

## Validação

Após o deploy, conferir em `/dash-g4` que Lotus aparece nas vendas (bucket "G4 - Finders Fee (fora das lives)" se não houver live atribuída, ou dentro da live correspondente).
