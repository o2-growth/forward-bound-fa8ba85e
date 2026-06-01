
## Objetivo

Criar uma nova sub-aba **Typeform** dentro de **Indicadores › Comercial**, exibindo um painel de métricas do diagnóstico O2 a partir do Supabase externo `uqkuwbbfvuarupfsioak`.

## Onde encaixa

Hoje `IndicatorsTab.tsx` é renderizado direto em `IndicatorsWrapper` na aba Comercial. Vou envolvê-lo em uma sub-`Tabs` interno com duas abas:

- **Funil & Metas** (componente atual `IndicatorsTab`)
- **Typeform** (novo `TypeformDashboard`)

Arquivo alterado: `src/components/planning/IndicatorsWrapper.tsx` (ou um wrapper novo `ComercialSubTabs.tsx`).

## Conexão com Supabase externo

A URL e a anon key são públicas (só leem views agregadas). Vou criar um client REST dedicado em `src/integrations/typeform/client.ts`:

```ts
const TYPEFORM_URL = "https://uqkuwbbfvuarupfsioak.supabase.co/rest/v1";
const TYPEFORM_KEY = "<anon key fornecida>";

export async function fetchView<T>(view: string, query = ""): Promise<T[]> {
  const res = await fetch(`${TYPEFORM_URL}/${view}${query}`, {
    headers: {
      apikey: TYPEFORM_KEY,
      Authorization: `Bearer ${TYPEFORM_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Typeform view ${view}: ${res.status}`);
  return res.json();
}
```

Como é um Supabase diferente do projeto, **não** uso o client existente — fica isolado. A chave anon vai no código (é pública e a própria mensagem do usuário confirma que é seguro).

## Estrutura de arquivos novos

```
src/components/planning/typeform/
  TypeformDashboard.tsx        // monta as 4 linhas do layout
  useTypeformData.ts           // hooks (react-query) para cada view
  KpiBig.tsx                   // card grande de KPI
  SdrBarChart.tsx              // barra horizontal (recharts)
  PipelineTimeline.tsx         // linha do tempo de reuniões
  FunnelTable.tsx              // tabela genérica (faturamento/setor)
src/integrations/typeform/client.ts
```

## Layout (conforme especificação do usuário)

**Linha 1 — 4 KPI cards** (view `v_o2_diag_kpis`, 1 linha):
- Leads únicos = `total_leads`
- MQLs = `total_mqls`
- MQLs agendaram = `mql_agendados`
- Conv. MQL = `mql_taxa_agenda_pct` + "%"

**Linha 2 — 2 gráficos**:
- Barra horizontal SDRs (`v_o2_diag_by_sdr` ordenada por `agendados` DESC) — Recharts `BarChart` layout="vertical"
- Linha do tempo de reuniões futuras (`v_o2_diag_pipeline`) — Recharts `LineChart` em `booking_date` × `reunioes`

**Linha 3 — 2 tabelas lado a lado**:
- Funil por faturamento (`v_o2_diag_by_faturamento` ordenada por `total` DESC) — colunas: faixa, total, completos, agendados, % completo, % agenda
- Funil por setor (`v_o2_diag_by_setor`) — colunas: setor, mqls, agendados, % conv

**Linha 4 — 2 cards finais**:
- Velocidade mediana = `mediana_min` + " min" (de `v_o2_diag_velocidade`)
- Cobertura SDR = `(qtd SDRs com MQLs > 0 / total_mqls) × 100%` (derivado de `v_o2_diag_by_sdr` + `v_o2_diag_kpis`)

## Carregamento de dados

Usar `@tanstack/react-query` (já no projeto) com `staleTime: 5min`. Um hook por view, todos chamados em paralelo no `TypeformDashboard`. Estados de loading via `Skeleton`, erros via `Alert`.

## Estilo

Reaproveitar `Card`/`CardHeader`/`CardContent` e tokens semânticos do design system (sem cores hardcoded). Grid responsivo (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4` para Linha 1, `md:grid-cols-2` para Linhas 2–4).

## Fora do escopo

- Filtros interativos (período, SDR, faixa) — versão 1 apenas exibe os agregados como retornados pelas views
- Persistência/cache em Supabase do projeto
- Auth no Supabase externo (anon key inline é suficiente)

Confirma que posso seguir?
