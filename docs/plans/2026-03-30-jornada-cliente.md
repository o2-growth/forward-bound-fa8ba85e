# Jornada do Cliente - Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar nova aba "Jornada" no dashboard Planning2026 com visao completa da operacao: pipeline por fase, saude por cliente, performance por CFO, alertas operacionais, e drill-downs clicaveis.

**Architecture:** Nova aba top-level no Planning2026 com 4 sub-abas internas (Pipeline, Clientes, CFOs, Alertas). Um hook central `useJornadaData` agrega dados de 7 tabelas externas (central_projetos, setup, tratativas, nps, rotinas, db_clientes, card_connections). Componentes leves e focados, reusando DetailSheet e KpiCard existentes.

**Tech Stack:** React 18, TypeScript, Recharts, shadcn-ui, @tanstack/react-query, Supabase Edge Functions (query-external-db)

---

## File Structure

### New Files
```
src/hooks/useJornadaData.ts                          # Hook central - agrega todas as 7 tabelas
src/components/planning/JornadaTab.tsx                # Wrapper com sub-abas
src/components/planning/jornada/PipelineView.tsx      # Visao pipeline: quantos em cada fase
src/components/planning/jornada/ClientesView.tsx      # Tabela de clientes com score de saude
src/components/planning/jornada/CfoView.tsx           # Performance por CFO
src/components/planning/jornada/AlertasView.tsx       # Alertas operacionais
src/components/planning/jornada/ClienteHealthCard.tsx  # Card de saude individual do cliente
src/components/planning/jornada/types.ts              # Tipos compartilhados
```

### Modified Files
```
src/pages/Planning2026.tsx          # Adicionar tab "Jornada"
src/hooks/useUserPermissions.ts     # Adicionar TabKey 'jornada'
```

---

## Task 1: Tipos e Hook de Dados (useJornadaData)

**Files:**
- Create: `src/components/planning/jornada/types.ts`
- Create: `src/hooks/useJornadaData.ts`

- [ ] **Step 1: Criar types.ts com todas as interfaces**

```typescript
// src/components/planning/jornada/types.ts

export interface JornadaCliente {
  id: string;
  titulo: string;       // Nome do projeto/cliente
  faseAtual: string;    // Fase no Central de Projetos
  cfo: string;
  produto: string;
  mrr: number;          // Valor CFOaaS
  valorSetup: number;
  valorEducacao: number;
  valorDiagnostico: number;
  erp: string;
  setor: string;
  uf: string;
  dataAssinatura: Date | null;  // Do DB Clientes
  dataEntrada: Date;            // Quando entrou na fase atual

  // Saude (calculados)
  healthScore: number;       // 0-100
  healthLevel: 'green' | 'yellow' | 'red';

  // Setup
  setupStatus: 'sem_setup' | 'em_andamento' | 'atrasado' | 'concluido';
  setupDias: number | null;
  setupFase: string | null;

  // NPS
  ultimoNps: number | null;
  ultimoCsat: number | null;
  npsClassificacao: 'promotor' | 'neutro' | 'detrator' | null;
  dataNps: Date | null;

  // Rotinas
  tarefasAtivas: number;
  tarefasAtrasadas: number;
  taxaEntrega: number;     // %

  // Tratativas
  tratativaAtiva: boolean;
  tratativaMotivo: string | null;
  tratativaDias: number | null;

  // Lifecycle
  lifetimeMonths: number | null;
  diasNaFaseAtual: number;
}

export interface JornadaCfo {
  nome: string;
  clientes: number;
  mrrTotal: number;
  mrrEmRisco: number;
  clientesAtivos: number;
  clientesSetup: number;
  clientesTratativa: number;
  clientesChurn: number;
  tarefasAtrasadas: number;
  taxaEntrega: number;
  npsMediaClientes: number | null;
  healthScoreMedio: number;
}

export interface JornadaAlerta {
  tipo: 'setup_atrasado' | 'tratativa_aberta' | 'tarefa_atrasada' | 'nps_detrator' | 'sem_nps' | 'churn';
  severidade: 'critico' | 'alto' | 'medio';
  cliente: string;
  clienteId: string;
  cfo: string;
  descricao: string;
  dias: number | null;
  valor: number | null;
}

export interface PipelineFase {
  fase: string;
  label: string;
  count: number;
  mrr: number;
  clientes: JornadaCliente[];
  cor: string;
}

export type JornadaFilter = {
  cfo: string[];
  produto: string[];
  healthLevel: ('green' | 'yellow' | 'red')[];
};
```

- [ ] **Step 2: Criar useJornadaData.ts - fetch de dados**

```typescript
// src/hooks/useJornadaData.ts
// Hook que busca as 7 tabelas em paralelo e processa em JornadaCliente[], JornadaCfo[], JornadaAlerta[], PipelineFase[]
```

O hook deve:
1. Buscar em paralelo via `supabase.functions.invoke('query-external-db')`:
   - pipefy_central_projetos (preview, limit 2000)
   - pipefy_moviment_setup (preview, limit 2000)
   - pipefy_moviment_tratativas (preview, limit 1000)
   - pipefy_moviment_nps (preview, limit 1000)
   - pipefy_moviment_rotinas (preview, limit 2000)
   - pipefy_db_clientes (preview, limit 1000)
   - pipefy_card_connections (preview, limit 2000)

2. Processar:
   - Filtrar Central Projetos: apenas onde Fase === Fase Atual (registro atual)
   - Construir mapa de assinaturas via db_clientes + card_connections
   - Construir mapa NPS: cardId → ultimo NPS score
   - Construir mapa Setup: cardId → status/dias/fase
   - Construir mapa Rotinas: cfo → tarefas ativas/atrasadas
   - Construir mapa Tratativas: cardId → motivo/dias

3. Calcular Health Score por cliente:
   - NPS peso 25: promotor=100, neutro=60, detrator=20, sem_nps=40
   - Tarefas peso 25: taxaEntrega% * 1
   - Setup peso 20: concluido=100, em_andamento=70, atrasado=20
   - Tratativa peso 15: sem_tratativa=100, com_tratativa=20
   - Tempo na fase peso 15: <30d=100, 30-90d=70, >90d=40

4. Agregar por CFO (JornadaCfo[])

5. Gerar Alertas (JornadaAlerta[]):
   - Setup > 90 dias → critico
   - Tratativa aberta > 30 dias → critico
   - Tratativa aberta < 30 dias → alto
   - NPS detrator (0-6) → alto
   - Tarefas atrasadas > 3 → alto
   - Sem NPS ha > 6 meses → medio
   - Churn recente → critico

6. Montar Pipeline (PipelineFase[]):
   - Onboarding | Em Operacao | Em Tratativa | Churn/Desistencia

- [ ] **Step 3: Commit**

```bash
git add src/components/planning/jornada/types.ts src/hooks/useJornadaData.ts
git commit -m "feat: add useJornadaData hook and types for customer journey tab"
```

---

## Task 2: JornadaTab Wrapper + Registro da Aba

**Files:**
- Create: `src/components/planning/JornadaTab.tsx`
- Modify: `src/pages/Planning2026.tsx`
- Modify: `src/hooks/useUserPermissions.ts`

- [ ] **Step 1: Criar JornadaTab.tsx com sub-abas**

Wrapper com 4 sub-abas: Pipeline | Clientes | CFOs | Alertas.
Instancia useJornadaData uma vez e passa dados para cada sub-aba.
Inclui filtros globais (CFO, Produto, Health Level).

- [ ] **Step 2: Adicionar TabKey 'jornada' no useUserPermissions.ts**

Adicionar `'jornada'` ao type TabKey.

- [ ] **Step 3: Registrar aba no Planning2026.tsx**

Adicionar no TAB_CONFIG: `{ key: 'jornada', label: 'Jornada', icon: Route }` (icon da lucide-react).
Importar e renderizar JornadaTab no TabsContent correspondente.

- [ ] **Step 4: Commit**

```bash
git add src/components/planning/JornadaTab.tsx src/pages/Planning2026.tsx src/hooks/useUserPermissions.ts
git commit -m "feat: register Jornada tab in Planning2026 dashboard"
```

---

## Task 3: PipelineView - Visao de Pipeline por Fase

**Files:**
- Create: `src/components/planning/jornada/PipelineView.tsx`

- [ ] **Step 1: Implementar PipelineView**

Layout:
```
[KPI Cards: Total Ativos | MRR Total | Em Onboarding | Em Operacao | Em Tratativa | Churns]

[Pipeline Visual - barras horizontais empilhadas por fase]
  Onboarding    ████████░░░░░░░  32 clientes  |  R$ 180k MRR
  Em Operacao   ████████████████  156 clientes |  R$ 1.2M MRR
  Em Tratativa  ███░░░░░░░░░░░░  12 clientes  |  R$ 95k MRR
  Churn         ██░░░░░░░░░░░░░  8 clientes   |  R$ 45k MRR

[Clique em qualquer barra → abre lista de clientes naquela fase]
```

Props: `{ pipeline: PipelineFase[], kpis: {...} }`
Cada barra eh clicavel → abre DetailSheet com os clientes da fase.

- [ ] **Step 2: Commit**

---

## Task 4: ClientesView - Tabela de Clientes com Health Score

**Files:**
- Create: `src/components/planning/jornada/ClientesView.tsx`
- Create: `src/components/planning/jornada/ClienteHealthCard.tsx`

- [ ] **Step 1: Implementar ClienteHealthCard**

Card compacto mostrando:
- Nome do cliente + badge da fase atual
- Health Score (gauge circular 0-100, cor = green/yellow/red)
- Mini-indicadores: NPS | Tarefas | Setup | Tratativa (icones com cor)
- MRR
- CFO responsavel

- [ ] **Step 2: Implementar ClientesView**

Layout:
```
[Busca por nome] [Ordenar por: Health Score | MRR | Nome | Fase]

[Tabela scrollavel]
  Health | Cliente          | Fase           | CFO    | MRR    | NPS | Tarefas | Setup    | Tratativa
  🟢 85  | Empresa ABC      | Em Operacao    | Lucas  | R$ 15k | 9   | 12/12   | Concluido| -
  🟡 55  | Empresa DEF      | Em Operacao    | Pedro  | R$ 8k  | 7   | 8/10    | Concluido| -
  🔴 25  | Empresa GHI      | Em Tratativa   | Daniel | R$ 22k | 3   | 5/12    | Atrasado | Pedido de Churn (15d)

[Clique na linha → abre card detalhado do cliente com timeline]
```

Drill-down do cliente mostra:
- Timeline: Assinatura → Setup → Operacao → NPS → Tratativa (com datas)
- Historico de NPS
- Tarefas pendentes
- Detalhes da tratativa (se houver)

- [ ] **Step 3: Commit**

---

## Task 5: CfoView - Performance por CFO

**Files:**
- Create: `src/components/planning/jornada/CfoView.tsx`

- [ ] **Step 1: Implementar CfoView**

Layout:
```
[Cards de CFO - grid responsivo]

┌─────────────────────────────┐
│ Lucas Ilha                  │
│ 45 clientes | R$ 380k MRR  │
│                             │
│ Health: ████████░░ 78       │
│ Entrega: 92%  🟢            │
│ Em Tratativa: 2  🟡         │
│ Setup Atrasado: 0  🟢       │
│ NPS Medio: 72  🟢           │
│ MRR Risco: R$ 15k           │
└─────────────────────────────┘

[Clique no card → abre lista de clientes do CFO com health scores]
```

Tabela comparativa abaixo dos cards:
| CFO | Clientes | MRR | Health Medio | Entrega% | Tratativas | NPS |
Ordenavel por qualquer coluna.

- [ ] **Step 2: Commit**

---

## Task 6: AlertasView - Alertas Operacionais

**Files:**
- Create: `src/components/planning/jornada/AlertasView.tsx`

- [ ] **Step 1: Implementar AlertasView**

Layout:
```
[Filtros: Todos | Criticos | Altos | Medios]

[KPI resumo: 3 criticos | 8 altos | 12 medios | R$ 250k em risco]

[Lista de alertas agrupados por severidade]

🔴 CRITICO
  Setup > 90 dias: Empresa ABC (CFO: Lucas) - 120 dias - R$ 15k MRR
  Tratativa > 30d: Empresa DEF (CFO: Pedro) - 45 dias - Pedido de Churn - R$ 22k MRR

🟠 ALTO
  NPS Detrator: Empresa GHI (CFO: Daniel) - NPS 3 - R$ 8k MRR
  Tarefas Atrasadas: Empresa JKL (CFO: Lucas) - 5 tarefas atrasadas

🟡 MEDIO
  Sem NPS > 6m: Empresa MNO (CFO: Pedro) - Ultimo NPS: Ago/2025

[Clique em qualquer alerta → abre detalhes do cliente no Pipefy]
```

Cada alerta eh clicavel e mostra o contexto completo.

- [ ] **Step 2: Commit**

---

## Task 7: Integracao e Testes

**Files:**
- Modify: todos os arquivos criados (ajustes de integracao)

- [ ] **Step 1: Verificar TypeScript compila sem erros**

```bash
node_modules/.bin/tsc --noEmit
```

- [ ] **Step 2: Testar no browser**

- Verificar que a aba "Jornada" aparece no menu
- Verificar que as 4 sub-abas funcionam
- Verificar que os dados carregam (loading states)
- Verificar que os filtros funcionam
- Verificar que os drill-downs abrem
- Verificar que funciona com diferentes BUs

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat: add Jornada do Cliente tab with pipeline, clients, CFOs, and alerts views"
```

---

## Ordem de Execucao

```
Task 1: Types + Hook (fundacao de dados)
  ↓
Task 2: Wrapper + Registro (aba visivel no menu)
  ↓
Task 3: PipelineView (primeira visualizacao funcional)
  ↓
Task 4: ClientesView (tabela principal com health score)
  ↓
Task 5: CfoView (performance por CFO)
  ↓
Task 6: AlertasView (alertas operacionais)
  ↓
Task 7: Integracao e testes
```

Cada task pode ser commitada independentemente. A aba fica funcional a partir da Task 3.
