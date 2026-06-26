
## Objetivo
Substituir o valor da linha **"Time e ferramentas"** (hoje vindo da planilha `Indicadores 26` via `useMarketingSheetData`) por um cálculo direto do DRE Oxy detalhado, igual ao que já fazemos no squad dos CFOs — mas agora cobrindo **a Oxy inteira** (todos os times de todas as BUs + ferramentas/softwares de todas as áreas).

Esse valor alimenta:
- A linha "Time e ferramentas" da seção **Indicadores 26 consolidada** (`ConsolidatedIndicators26Section`)
- O cálculo de **CAC** do hero `InvestmentCacMqlHero` → CAC = (Mídia + Time e ferramentas) ÷ Vendas
- A coluna `cacOpex` em `MarketingIndicatorsTab.tsx` (linha 707)

## O que já temos pronto
- `useSquadCostFromDre` → drill-down por CNPJ/CPF/nome para vincular lançamentos a pessoas (escopo: apenas categorias CaaS dos squads de CFO).
- `usePersonnelCostByBu` → já agrega TODAS as categorias de **pessoal** (regex `equipe|benef|estagiari|...|terceiros`) por BU + corporativo. Hoje é usado para custo de pessoal e turnover. Já cobre Oxy inteira.
- `fetch-oxy-finance` edge function com action `dre_categories` (pega todas as categorias de grupos do DRE).

## Estrutura confirmada no DRE Oxy (junho/26)

**Grupos relevantes:**
| Grupo (code) | Função |
|---|---|
| `Custos CaaS/SaaS/CS/Expansão/Tax` (CV) | Equipe + Softwares & Ferramentas da BU |
| `Despesas com Pessoal` (DX) | Salários, Pró-labore, Benefícios, FGTS/INSS, Cursos/Treinamentos, Serviços de Terceiros (corporativo) |
| `Despesas de Marketing` (DX) | Assessoria MKT, Softwares e Ferramentas - Marketing, Serviços de Terceiros MKT |
| `Despesas Comerciais` (DX) | Comissão de Parceiros, Comissionamentos & Premiações, Softwares e Ferramentas - Comercial, Serviços de Terceiros Comercial |
| `Despesas Administrativas` (DX) | Softwares e Ferramentas - Administrativo, Assessoria de Informática, Eventos Internos |

**Categorias que classifico como TIME (toda a empresa):**
- Por BU: `Equipe CaaS/SaaS/CS/Expansão/Tax`, `Benefícios - <BU>`, `Remuneração de Estagiários - <BU>`, `Custo com Deslocamento/Alimentação/Viagens - <BU>`
- Corporativo (Despesas com Pessoal): `Salários`, `Benefícios`, `FGTS`, `INSS`, `Pró-labore sócios`, `Distribuição de Lucros`, `Remuneração de Estagiários`, `Rescisões`, `Cursos e Treinamentos`, `Menor Aprendiz`, `Serviços de Terceiros`, `Férias`, `13º`, `Seguro de Vida`, `Produtos O2 - Endomarketing`
- Marketing: `Assessoria Marketing`, `Serviços de Terceiros Marketing`, `Alimentação/Deslocamento/Viagens - Marketing`
- Comercial: `Comissão de Parceiros`, `Comissionamentos e Premiações Equipe`, `Serviços de Terceiros Comercial`, `Alimentação/Deslocamento - Comercial`
- Administrativo: `Alimentação/Deslocamento/Viagens - Administrativo`

**Categorias que classifico como FERRAMENTAS:**
- `Softwares e Ferramentas - CaaS`
- `Softwares e Ferramentas - SaaS`
- `Softwares e Ferramentas - Customer Success`
- `Softwares e Ferramentas - Expansão`
- `Softwares e Ferramentas - Tax`
- `Softwares e Ferramentas - Marketing`
- `Softwares e Ferramentas - Comercial`
- `Softwares e Ferramentas - Administrativo`
- `Assessoria de informática` (Administrativo)

> Soma em jun/26: Time ≈ R$ 540k + Ferramentas ≈ R$ 13,5k (5 Softwares & Ferramentas + Assessoria informática). Posso refinar quando você confirmar o que entra/sai.

## Implementação

1. **Novo hook** `src/hooks/useTimeEFerramentasFromDre.ts`
   - Reaproveita `fetchDreGroups` + `fetchDreCategories` (mesma assinatura do `usePersonnelCostByBu`).
   - Classifica cada categoria em 3 buckets via regex sobre o label:
     - `FERRAMENTAS_RE = /software.*ferrament|ferrament.*software|assessoria de informatica/i`
     - `TIME_RE` igual ao `PERSONNEL_RE` atual **+** `assessoria marketing|comiss[aã]o de parceiros|comissionamento|premiac|servic.*terceiro.*marketing|servic.*terceiro.*comercial`
   - Retorna `{ time, ferramentas, total, serie: { period, time, ferramentas }[], categoriasTime[], categoriasFerramentas[], isLoading, error }`.
   - Suporte ao mesmo range mensal/YTD que o resto da aba.

2. **Integrar no `MarketingIndicatorsTab.tsx`**
   - Substituir `sheetData?.timeFerramentas` por `dreData.total` (com fallback para o valor da planilha quando a query falhar ou estiver fora do range coberto pelo DRE).
   - Recalcular `cacOpex` com o novo número e adicionar tooltip explicando origem (DRE Oxy: Time + Ferramentas).

3. **Integrar no `ConsolidatedIndicators26Section.tsx`**
   - Para a linha `Time e ferramentas`: priorizar valor do hook DRE quando a coluna for um mês de 2026 dentro do range do DRE.
   - Tornar a linha clicável (já existe `IndicatorTrendDialog`) e detalhar o breakdown Time vs Ferramentas com lista de categorias.

4. **Telemetria** – `console.debug` com diagnóstico (igual ao squad-cost) para validarmos mês a mês.

## Detalhes técnicos
- Range: usa `dateRange` global da aba (mesmo do hero).
- DRE retorna por mês — somamos só os meses dentro do filtro (`periodInRange` igual ao `usePersonnelCostByBu`).
- Sem mudanças de schema, sem novas tabelas. Apenas reuso de edge function existente.

## Antes de eu codar, confirma 3 pontos:
1. **Pró-labore sócios** (≈R$ 41,5k/mês) entra no "Time"? *(faz parte do custo do time, mas alguns dashboards isolam)*
2. **Comissão de Parceiros + Comissionamentos** (R$ 18,5k/mês em jun) — entra em "Time" ou tratamos como custo de mídia/comercial separado?
3. **Eventos Internos** (R$ 3,2k) e **Assessoria Contábil/Financeira/Jurídica/RH** (≈R$ 23k) — entram em "Time e ferramentas" ou só nas "Despesas totais"?

Posso já assumir defaults (1 ✅ Sim, 2 ✅ Sim em Time, 3 ❌ Não — entram só em Despesas totais), mas prefiro alinhar antes para não retrabalhar.
