## Resumo IA na aba de Churns

Vou seguir o padrão que já funciona em **Cliente360** (Sparkles + Gemini 2.5 Flash + drawer): cada linha de churn ganha um botão "Análise IA" que abre um painel lateral com diagnóstico gerado a partir do histórico de tratativa daquele cliente. Isso é o que rende mais valor — o resumo agregado do período fica como bloco opcional no topo (versão 2).

## O que será feito

### 1. Edge Function nova: `analyze-churn-tratativa`
Espelha a estrutura da `analyze-cliente-360`:
- Recebe `{ clienteId, titulo }` (id Pipefy do card de churn + título do cliente para fallback).
- Conecta no Postgres externo e busca:
  - **Histórico completo da tratativa**: `SELECT * FROM pipefy_moviment_tratativas WHERE "Título" = $1 ORDER BY "Entrada"` — captura todas as fases percorridas, motivo, decisão final, motivo churn, satisfação do cliente, responsável.
  - **Card de churn** (Central de Projetos): fase atual, MRR, Setup, data de assinatura, data de encerramento, LT, problemas com a Oxy, produto, CFO.
  - **Últimas N respostas de NPS** do cliente (mesma chave por título), para contextualizar deterioração de satisfação antes do churn.
- Monta um JSON consolidado e envia ao Gemini 2.5 Flash com prompt específico de **post-mortem de churn**:
  - **Status:** 🟢 evitável | 🟡 parcialmente evitável | 🔴 inevitável
  - **📌 O que aconteceu** — linha do tempo da tratativa (entrada → saída de cada fase, dias)
  - **🎯 Causa raiz** — motivo declarado vs sinais nos dados (NPS caindo, problema Oxy, etc.)
  - **💸 Impacto** — MRR perdido, LT realizado, Setup recuperado/perdido
  - **🛡️ Lições para retenção** — 1-3 ações concretas para evitar churns semelhantes (verbo + dono + prazo)
  - Mesmas regras anti-alucinação do prompt do Cliente360 (só usa dados do JSON, cita datas/IDs como evidência).

### 2. Hook novo: `useChurnTratativaAnalysis`
Idêntico em forma ao `useCliente360`: React Query com `staleTime` de 1h, chave `['churn-tratativa', clienteId]`, invoca a edge function. Botão "Regenerar" reseta a query.

### 3. Drawer novo: `ChurnAnalysisDrawer`
Reutiliza a estética do `Cliente360Drawer` (Sheet à direita, Sparkles, skeleton de loading, render markdown leve com **bold**/bullets, `<details>` com JSON cru para debug).
Header mostra: cliente, mês de churn, MRR perdido, LT, motivo principal.

### 4. Integração em `ChurnDossierSection.tsx`
Na coluna "Ações" de cada linha (onde hoje só tem "Ver card" do Pipefy), adicionar **botão Sparkles "Análise IA"** ao lado. Clique abre o drawer com o `id` do card de churn.

### 5. Resumo agregado (opcional, fase 2)
Bloco compacto acima da tabela com 1 botão "Gerar resumo do período" — chama a mesma edge function em modo `aggregate` (recebe lista de IDs filtrados, devolve análise de padrões: motivos predominantes, MRR total perdido, perfil dos churns evitáveis vs inevitáveis). Implemento só se você confirmar depois — começo pelo drill-down individual.

## Detalhes técnicos

- **Modelo:** `google/gemini-2.5-flash` via `GEMINI_API_KEY` (já configurada, mesmo padrão do Cliente360).
- **Auth:** edge function valida JWT (mesmo bloco do Cliente360); só usuários autenticados acessam.
- **Resolução de ID:** o `ChurnDossierCard.id` vem do pipe `Central de Projetos`. A query principal de tratativa vai por **título normalizado** (mesma chave que o `tratativaMap` em `useOperationsData.ts` já usa) — fallback robusto quando não há `pipefy_card_connections`.
- **Cache:** React Query mantém análise por 1h. Sintéticos (`synthetic-apr2026-*` injetados na correção de Abril) **desabilitam** o botão (não há histórico no DB para esses).
- **Custo:** prompt + JSON da tratativa fica na ordem de 5-15k tokens por análise; 1 chamada por cliente sob demanda.

## Arquivos

- **Criar:** `supabase/functions/analyze-churn-tratativa/index.ts`
- **Criar:** `src/hooks/useChurnTratativaAnalysis.ts`
- **Criar:** `src/components/planning/cs/ChurnAnalysisDrawer.tsx`
- **Editar:** `src/components/planning/nps/ChurnDossierSection.tsx` (botão na coluna Ações + estado do drawer)
