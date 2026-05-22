## Objetivo

Tornar todos os 7 KPI cards da página de Churn (`ChurnDossierSection.tsx`) clicáveis, abrindo um drawer com a lista detalhada dos clientes que compõem cada métrica.

## Cards alvo

**Linha 1 — Estado atual:**
1. **MRR** (ativo) → lista de clientes ativos com seu MRR
2. **Clientes Ativos** → mesma lista, mas focada em qtd
3. **LT Médio (churns)** → lista de churns do período com LT individual

**Linha 2 — Churn no período:**
4. **Revenue Churn (R$)** → lista de churns ordenada por MRR desc
5. **Revenue Churn (%)** → mesma lista + base de cálculo no header
6. **Logo Churn (Qtd.)** → lista de churns ordenada por data
7. **Logo Churn (%)** → mesma + base de cálculo
8. **Taxa de Salvamento** → 2 grupos: tratativas salvas e churns

## Implementação

### 1. Novo componente `ChurnKpiDrawer.tsx`

`src/components/planning/cs/ChurnKpiDrawer.tsx` — drawer (Sheet) lateral genérico que recebe:

```ts
type KpiDrawerData = {
  title: string;              // ex: "Revenue Churn no período"
  subtitle?: string;          // ex: "R$ 450.000 · 18 clientes"
  formula?: string;           // breve explicação do cálculo
  columns: ('cliente'|'cfo'|'mrr'|'setup'|'lt'|'motivo'|'data'|'fase')[];
  rows: Array<ChurnDossierCard | ActiveClient>;
};
```

Renderiza header com título + subtítulo + fórmula, e tabela compacta com link pro Pipefy em cada linha (reusa `PipefyCardLink`).

### 2. Receber dados de clientes ativos

`ChurnDossierSection` hoje recebe só `activeClientesCount` e `activeMrr` (números). Precisa também da **lista** de clientes ativos pra alimentar os drawers de MRR e Clientes Ativos.

- Em `useOperationsData.ts`: expor `activeClients: CfoClient[]` (já existe agregado por CFO em `cfoDistribution[].clients` — vou achatar num array único).
- Propagar via `NpsTab` → `ChurnDossierSection` como nova prop `activeClients?: ActiveClient[]`.

### 3. Tornar cards clicáveis

Cada `<Card>` ganha:
- `role="button"`, `tabIndex={0}`, `onClick={() => setDrawer({...})}`
- `cursor-pointer hover:border-{cor}/50 transition` (manter cores existentes)
- Pequeno ícone `ChevronRight` no canto pra indicar interatividade

### 4. Estado central

```ts
const [drawerKpi, setDrawerKpi] = useState<KpiDrawerData | null>(null);
```

Cada handler monta o `KpiDrawerData` apropriado a partir de `filtered`, `activeClients`, `tratativasResolvidasCount`.

### 5. Tratativas salvas

Pro card "Taxa de Salvamento" precisamos da **lista** de tratativas resolvidas. Hoje só vem a contagem (`tratativasResolvidasCount`). Adicionar prop opcional `tratativasResolvidas?: TratativaResolvida[]` propagada de cima — se vier vazia, o drawer mostra apenas a contagem + lista de churns no outro grupo.

## Arquivos afetados

- **novo:** `src/components/planning/cs/ChurnKpiDrawer.tsx`
- `src/components/planning/nps/ChurnDossierSection.tsx` — cards clicáveis + handlers + drawer
- `src/hooks/useOperationsData.ts` — expor `activeClients` no retorno
- `src/components/planning/NpsTab.tsx` (e/ou `CustomerSuccessTab.tsx`) — propagar `activeClients` e `tratativasResolvidas`

## Fora de escopo

- Charts (motivos/CFO/timeline) não vão virar clicáveis nesta iteração.
- Comportamento da tabela do dossiê (já tem expand + análise) permanece igual.
