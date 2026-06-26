## Objetivo
Permitir que cada card de indicador na aba **Visão CEO** (`src/components/planning/CeoViewTab.tsx`) seja clicável, abrindo um painel lateral com detalhamento (lista, breakdown, gráfico ou tabela) — mantendo o respeito ao filtro de período já existente.

## Abordagem

### 1. Componente reutilizável `CeoMetricDialog`
Criar `src/components/planning/ceo/CeoMetricDialog.tsx` — um `Sheet` lateral (mesmo padrão do `DetailSheet` do Comercial) que recebe:
- `title`, `subtitle`, `value`
- `mode`: `"list" | "breakdown" | "trend" | "table"`
- `data`: payload específico
- `columns` (quando tabela), com **header sticky** (padrão já consolidado no projeto)

### 2. Tornar `MetricCard` clicável
Adicionar prop opcional `onClick` ao `MetricCard` (linha 88). Quando presente:
- `cursor-pointer`, hover ring e ícone discreto de "expandir" no canto.
- Sem `onClick` → comportamento atual (não clicável).

### 3. Mapeamento de drill-down por indicador

**Faixa Hero (topo):**
- **Faturamento** → tabela de vendas do período (BU, cliente, MRR, Setup, Pontual, data assinatura) — reaproveita `comercial.allSalesCards` que já existe no escopo.
- **ARR (novo MRR)** → mesma lista, ordenada por MRR novo desc.
- **Churn (logos)** → lista do `churnDossier` filtrado (cliente, squad, MRR perdido, LT, motivo, data).
- **NPS** → breakdown Promotores/Neutros/Detratores + lista de respostas do período (quando `nps.source === "live"`).

**Aquisição:**
- **Investimento mídia** → breakdown Meta vs Google (mês a mês se mais de 1 mês no filtro).
- **Leads** / **MQLs** → tabela com origem (BU), data, valor estimado — usar cards já agregados de `useModeloAtual`, `useO2Tax`, `useExpansao`, `useOutbound`, `useOxyHacker`.
- **Custo por MQL** → fórmula + decomposição (invest total, total MQLs por canal).
- **Melhor canal** → ranking de canais (leads, CPL, CPMQL).

**Comercial:**
- **Total de vendas / Faturamento / MRR novo / Ticket médio** → tabela de vendas (mesma do hero), com colunas ajustadas + totalizadores.
- **Melhor BU** → ranking das 5 BUs (Modelo, O2 TAX, Expansão, Outbound, Monetização) com qty + valor.

**Operação:**
- **Clientes ativos / MRR base / Tratativas / MRR em risco** → snapshot atual (marcar como "snapshot"), listando clientes (já temos via `operacao` hooks).
- **Churn (logos) / Retenção** → mesmo dossier do hero (filtrado pelo período).

**Pessoas:**
- **Headcount / Admissões / Desligamentos / Turnover / Tempo de casa** → tabela de colaboradores do período (admissões e desligamentos com data) a partir de `useHrData`.

**NPS (seção):**
- **NPS / CSAT / Promotores / Neutros / Detratores** → lista de respostas do período + drill por CFO/squad.

### 4. Comportamento
- Estado local `const [drill, setDrill] = useState<DrillPayload | null>(null)` em `CeoViewTab`.
- Cada `MetricCard` recebe `onClick={() => setDrill({...})}`.
- Um único `<CeoMetricDialog open={!!drill} onClose={...} payload={drill} />` no fim do componente.
- Snapshots ficam claramente rotulados ("dados atuais, não filtrados pelo período").

### 5. Sem alterações em hooks/regra de negócio
Toda a informação necessária já está disponível nos hooks usados pelo `CeoViewTab` (`useCommercialOverview`, `useOperationsData`, `useMarketingSheetData`, `useHrData`, `useNpsData`, hooks de BU). O trabalho é só de UI/apresentação.

## Arquivos
- **Novo:** `src/components/planning/ceo/CeoMetricDialog.tsx`
- **Editado:** `src/components/planning/CeoViewTab.tsx` (adiciona `onClick` em cada `MetricCard`, monta payloads, renderiza o dialog)
- **Editado (mínimo):** `MetricCard` para suportar `onClick` + estado hover

## Fora de escopo
- Mudar fontes de dados ou lógicas de cálculo (já validados em ajustes anteriores).
- Editar a aba Comercial/Marketing/Operação — o drill-down do CEO é autônomo.
