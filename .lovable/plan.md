## Objetivo

Adicionar, no painel G4 (`G4Tab`), um novo bloco "Dashboard Consolidado" onde cada **linha = uma data de live/evento**, com todas as métricas do funil, temperatura, perdas e valores — consumindo a mesma fonte que já usamos hoje (`g4-metrics`).

## Escopo

- Fonte: `supabase/functions/g4-metrics` (Pipefy Modelo Atual join com `g4_inscritos` / `g4_diagnostico` / `g4_leads_360`).
- Agrupamento: uma linha por data. Cada live/evento vira uma linha só (usando o `LIVE_CANONICAL_MAP` já existente para dedup de rótulos como "Live - G4 - 20-mai" ↔ "Live G4 - 20/05/2026").
- Todos os leads exibidos são os que vieram por aquela live/evento (`lead.lives.includes(live)`), independente do pipe onde estejam hoje.

## O que aparece por linha (colunas expansíveis)

Colapsado (visão de tabela):
- Data / Live ou Evento
- Leads (inscritos) · MQLs (levantaram a mão)
- Em contato (fases pré-proposta: `Tentativas de contato`, `Reunião marcada`, `Reunião realizada`)
- Quentes (Temperatura = Quente)
- Fechados (fase = `Ganho`)
- Perdidos (fase começa com `Perdido` / `Perda`)
- MRR · Setup · Pontual · TCV · Ticket médio das vendas

Expandido (drill-down por linha, tabs):
- **Por fase**: contagem por `faseAtual` (todas as fases que aparecerem naqueles leads)
- **Temperatura**: Quente / Morno / Frio (campo Temperatura do Pipefy)
- **Perdidos**: lista + agrupamento por `motivoPerda`
- **Vendas**: tabela com empresa, closer, MRR, Setup, Pontual, TCV, link Pipefy
- **Ticket médio**: Setup + (MRR × 1) + Pontual, calculado só sobre os `Ganho` da linha

## Fórmulas

- Ticket médio = média de `(setup + mrr + pontual)` entre os cards `Ganho` da live/evento (mesma fórmula usada em Indicadores Comercial).
- TCV = `mrr × 12 + setup + pontual` (padrão do projeto).
- "Em contato" = fases pré-proposta listadas acima; ajustável se você quiser incluir/excluir alguma.
- Perdidos = qualquer card cuja `faseAtual` normalizada comece com `perdido` ou `perda` (mesma regra de `temperaturaAggregator`).

## Ajustes técnicos

1. **`supabase/functions/g4-metrics/index.ts`**: incluir na resposta de cada lead os campos `temperatura` e `motivoPerda` (hoje só temos `faseAtual`). Adicionar leitura desses dois campos do `pipefy_moviment_cfos` na CTE `pipe` e propagar no `SELECT` final. Tipagem correspondente em `useG4RealMetrics.ts`.
2. **Novo componente `G4ConsolidatedDashboard.tsx`** em `src/components/planning/g4/`:
   - Consome `useG4RealMetrics` (mesmo hook, cache compartilhado).
   - Agrupa `data.leads` por live canônica.
   - Tabela principal + linha expansível com as tabs descritas.
   - Usa `CollapsibleBlock` para fechar/abrir o bloco inteiro (padrão do restante do dashboard).
3. **`G4Tab.tsx`**: acrescentar o novo `<G4ConsolidatedDashboard />` acima do `<G4RealSection />` (mantém o funil visual atual, que é bom para leitura rápida).
4. Nenhum outro componente/lógica é tocado. Sem migrations. Sem mudança de rota.

## Fora do escopo

- Não altero `G4RealSection` (funil por live continua igual).
- Não crio novas fontes: uso o join Pipefy × g4_* já existente.
- Não separo eventos e lives em blocos distintos — tudo cronológico numa única tabela, conforme sua escolha.

## Entregável

Novo bloco no painel G4 com uma tabela consolidada de todas as lives/eventos, expansível por linha, mostrando funil, fases, temperatura, perdas com motivo, vendas e valores.
