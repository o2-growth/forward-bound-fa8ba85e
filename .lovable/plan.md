## Objetivo
Conectar o dashboard G4 (aba já existente) a uma base **PostgreSQL externa read-only** com dados reais das lives, levantadas de mão e diagnósticos — mostrando por lead a jornada completa com botão "Abrir no Pipefy".

## Arquitetura

```text
[G4Tab / Sections] → useG4RealMetrics() → supabase.functions.invoke('g4-metrics')
                                              ↓
                                    Edge Function (Deno)
                                              ↓
                                    Postgres externo (G4_PG_URL)
                                    read-only: só SELECT
```

Nenhum acesso direto ao Postgres pelo browser. Credencial em secret. O visual atual do dashboard G4 é mantido.

## Passos

### 1. Secret
- Registrar `G4_PG_URL` com a connection string fornecida (usuário `dash_g4_ro`, só SELECT).

### 2. Edge Function `supabase/functions/g4-metrics/index.ts`
- Runtime Deno, CORS liberado, `verify_jwt` padrão.
- Usa `postgres` (`https://deno.land/x/postgresjs/mod.js`) com `ssl: false`.
- Executa as 5 queries do briefing em paralelo (`Promise.all`).
- Retorna JSON:
  ```json
  {
    "kpis": { "totalLeads": n, "levantaramMao": n, "diagnosticos": n, "faturamento": n },
    "funil": [{ "live", "inscritos", "presentes", "levantaramMao", "vendas" }],
    "diagnosticoPorLive": [{ "live", "diagnosticos" }],
    "leads": [{ "nome","empresa","email","lives","presenteAlgumaLive","levantouMao","liveDaMao","fezDiagnostico","noPipe","faseAtual","closer","pipefyUrl" }],
    "generatedAt": "ISO"
  }
  ```
- Fecha `sql.end()` sempre; try/catch com 500 e mensagem.
- Maio (`Live G4 - 20-21/05/2026`) não tem `presente` — devolver `presentes: null` para a UI mostrar "—".

### 3. Hook `src/hooks/useG4RealMetrics.ts`
- React Query (`queryKey: ['g4-metrics']`, `staleTime: 60s`).
- Chama `supabase.functions.invoke('g4-metrics')`.
- Expõe `data, isLoading, isFetching, error, refetch`.

### 4. UI — reaproveitar componentes existentes em `src/components/planning/g4/`
- **`OverviewSection`**: KPIs (Total Leads, Levantaram a mão, Diagnósticos, Faturamento) + botão **Refresh** (ícone) que chama `refetch()`; badge com `generatedAt`.
- **`LivesSection`** / novo `LiveFunnelCard`: para cada live renderizar funil **Inscritos → Presentes → Levantaram a mão → Vendas** com % entre etapas, e métrica de **Diagnósticos** ao lado. Quando `presentes` é null, mostrar "—" com tooltip "Maio: sem presença/diagnóstico (fonte não capturou)".
- **Nova aba/tabela `LeadsTable.tsx`** dentro de `G4Tab`:
  - Colunas: Nome, Empresa, Live(s) (chips), Presente, Levantou a mão, Diagnóstico, Fase atual, Closer, Ação.
  - Botão **"Abrir no Pipefy →"** por linha: `<a href={pipefyUrl} target="_blank" rel="noopener">`. Se `pipefyUrl == null`, botão desabilitado com tooltip "sem card no pipe".
  - Filtros: `<Select>` por live, `<Select>` por fase, chips toggle (levantou a mão / fez diagnóstico / presente), input de busca (nome/empresa/email). Filtragem client-side sobre `leads`.
- Manter tokens do design system atual (cards escuros, acento verde/vermelho O2). Nada de cor hardcoded.

### 5. Comportamento e regras
- **Venda** = `fase_atual = 'Ganho'` (já nas queries).
- Match lead↔pipe por e-mail lowercased (já nas queries).
- Selo/aviso "Maio: sem presença/diagnóstico (fonte não capturou)" no card da live de maio.
- Números vão diferir do dashboard antigo — comportamento esperado.

### 6. Validação
- `supabase--curl_edge_functions` GET `/g4-metrics` para conferir shape e amostragem.
- Playwright screenshot da aba G4 confirmando KPIs, funil por live e tabela de leads com botão Pipefy.

## Fora de escopo
- Escrita no Postgres externo (usuário é RO).
- Alterar cálculos / UI de outras abas do dashboard.
- Migração das seções existentes que dependem de dados internos (Sellers, Eventos, DRE) — permanecem como estão nesta iteração.
