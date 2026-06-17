## Objetivo

Criar a sub-aba **Pessoas** dentro de Indicadores (ao lado de Comercial / Marketing / NPS / Growth) com os indicadores da Fase 1: Headcount & movimentação (3.1) e Custo de pessoal (3.2).

## Fontes de dados (já existentes)

| Indicador | Fonte | Como pegamos |
|---|---|---|
| Headcount atual, por área/time, Tempo de casa, Turnover | `pipefy_db_pessoas` (banco externo Pipefy) — campos `status`, `area`, `time`, `data_admissao`, `data_desligamento` | Nova `action: "pessoas_aggregated"` na edge function `query-external-db` (que já lista `pipefy_db_pessoas` como tabela válida) |
| Custo de pessoal total / Custo per capita / Custo / Receita / Custo de turnover | DRE Oxy Finance (já integrado em `useOxyFinance` + `dre-mapping-logic-v2`) | Novo hook `useCustoPessoal` que filtra as linhas/grupos: Folha, Encargos, Benefícios, Pró-labore, Rescisão (mapeamento exato a refinar depois com você) |
| Denominador "Custo / Receita" | Receita total Oxy Finance do período | Mesma fonte do DRE atual (Financeiro) |

## O que vou construir

### 1. Backend
- Adicionar `action: "pessoas_aggregated"` em `supabase/functions/query-external-db/index.ts`. Retorna em uma única chamada:
  - Lista de ativos (id, nome, área, time, data_admissao)
  - Lista de desligados no período (data_desligamento dentro do range)
  - Agregações por área e por time
- Mantém validação de JWT e role já existente.

### 2. Hooks
- `src/hooks/useHrData.ts` — invoca a action acima; expõe `headcountTotal`, `headcountPorArea`, `headcountPorTime`, `tempoMedioDeCasa`, `desligadosNoPeriodo`, `turnoverGeral`, `turnoverPorArea`.
- `src/hooks/useCustoPessoal.ts` — consome `useOxyFinance` filtrando categorias de pessoal; expõe `custoTotal`, `custoFolha`, `custoEncargos`, `custoBeneficios`, `custoProLabore`, `custoRescisao`, `custoPorReceita`, `custoPerCapita` (cruza com headcount médio do período).

### 3. UI
- `src/components/planning/PessoasTab.tsx` — nova sub-aba dentro de `IndicatorsTab.tsx`.
- Seções:
  - **3.1 Headcount & movimentação**
    - 5 KPI cards: Headcount atual, Tempo médio de casa, Turnover geral %, Desligados no período, Admissões no período
    - Tabela/gráfico de barras: Headcount por área e time
    - Mini-card: Turnover por área (top 5)
  - **3.2 Custo de pessoal**
    - 4 KPI cards: Custo total, Custo / Receita %, Custo per capita, Custo de turnover (rescisões)
    - Breakdown por categoria (Folha / Encargos / Benefícios / Pró-labore)
- Filtro de período reutilizando o seletor mensal/range padrão da aba.

### 4. Permissões
- Adicionar a tab "pessoas" em `user_tab_permissions` defaults (admin por padrão; você libera para outros depois).

## Fora de escopo agora
- Mapeamento detalhado das categorias DRE de Custo de pessoal — vamos refinar juntos depois que a UI estiver no ar (você confirmou "depois vamos ver detalhado"). Vou começar com um mapeamento provisório baseado nos nomes mais comuns do DRE atual e marco no card o que está sendo somado, pra você corrigir rápido.
- Indicadores fora da Fase 1 (engajamento, performance, etc.).

## Próximo passo após aprovar
1. Inspecionar schema real de `pipefy_db_pessoas` (nomes exatos das colunas) antes de codar a action.
2. Implementar nessa ordem: action → hooks → UI → ajuste de permissões.
