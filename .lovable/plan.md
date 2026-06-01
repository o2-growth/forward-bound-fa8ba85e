# Nova aba: Insights Comerciais — diagnóstico automático + alertas inteligentes

## Contexto

Hoje Pedro (Head Comercial) gasta reuniões inteiras abrindo o dashboard e analisando gráficos manualmente: olha vendedor por vendedor, vê quantos dias sem venda, compara funil do período vs anterior, tenta entender por que alguém parou de vender. Quero automatizar essa análise numa nova aba que cospe **insights curtos, práticos e acionáveis** com sistema de alertas.

Não é mais um dashboard de gráficos. É uma **leitura rápida** com cards de insight estilo "Maria está 12 dias sem venda — gargalo é RR→Venda — provável causa é mudança de mix de origem dos leads".

## Stack atual relevante

- Tabs estão em `src/pages/Planning2026.tsx`, `TAB_CONFIG` no topo
- Hooks de dados já prontos: `useModeloAtualAnalytics`, `useOutboundAnalytics`, `useExpansaoAnalytics`, `useO2TaxAnalytics`, `useCliente360`, `useCustomerSuccess`, `useMediaMetas`, `useConsolidatedMetas`
- Classificador de origem: `src/lib/leadSource.ts` (`classifyLeadSource`)
- Filtro global de período: já existe `dateRange` propagado via contexto/props no Planning2026
- Permissões: `useUserPermissions` (admin, cfo, etc.) — precisa adicionar visibilidade pra closer também
- Edge function de IA: `supabase/functions/ai-chat/index.ts` (Gemini 2.5 Flash) já está pronta

## Escopo desta entrega

### 1. Nova aba `'insights'`

Em `TAB_CONFIG` de `Planning2026.tsx`, adicionar:
```ts
{ key: 'insights', label: 'Insights Comerciais', icon: Sparkles }
```

Permissão: visível pra **admin** e **closers**. Atualize `useUserPermissions` se necessário pra incluir o role `closer` (ou equivalente — confira o que existe). NÃO mexer em permissões de outros tabs. CFO **não vê** essa aba (é comercial, não CS).

### 2. Componente `InsightsTab.tsx`

Localização: `src/components/planning/InsightsTab.tsx`

Estrutura visual:
- **Header**: contador agregado `🔴 X críticos · 🟡 Y atenção · 🟢 Z saudável` + filtros (tipo: todos / vendedor / BU / cliente) + toggle "ver só meus" (closer)
- **Lista de cards de insight** ordenada por severidade (crítico primeiro)
- Cada card: ícone de severidade, título curto, 2-4 linhas de detalhe (números + comparação), "provável causa" (vinda da IA), botão "ver detalhes" que abre Sheet com mais dados

Período: **lê do filtro global de data** já existente no Planning2026. Se filtro = mês corrente, analisa mês corrente vs mês anterior. Se filtro = semana, analisa semana vs semana anterior. Se for range customizado, compara com período de mesma duração imediatamente anterior.

### 3. Engine de regras: `src/lib/insightsEngine.ts`

TypeScript puro, recebe os dados dos hooks e devolve `Insight[]`. Cada regra é uma função independente. Regras mínimas a implementar:

**Por vendedor (closer + SDR):**
- `R1`: Dias desde última venda > 1.5x da média histórica do vendedor → 🟡; > 2.5x → 🔴
- `R2`: Volume de vendas no período < 60% da média histórica → 🟡; < 30% → 🔴
- `R3`: Conversão entre etapas (leads→MQL, MQL→RR, RR→venda) caiu > 30% vs período anterior → 🟡; > 50% → 🔴
- `R4`: Ticket médio caiu > 25% vs histórico → 🟡
- `R5`: Volume de leads recebidos caiu > 40% → 🟡 (alerta de fome de pipeline)
- `R6`: Mix de origem mudou (ex: era 30% inbound, virou 80% organico) → 🟡

**Por BU:**
- `R7`: Faturamento < 70% da meta no período → 🟡; < 50% → 🔴
- `R8`: Funil furando — qual etapa caiu mais vs período anterior, mostrar
- `R9`: Crescimento negativo 2 semanas seguidas → 🟡; 3+ → 🔴

**Por cliente (cross com CS):**
- `R10`: NPS atual < 7 + tratativa aberta há > 7 dias → 🔴
- `R11`: Setup atrasado > 30 dias da meta → 🟡
- `R12`: MRR concentrado: top 3 clientes > 40% do MRR total da BU → 🟡 (info de risco)

**Saudáveis (🟢):**
- `R13`: Vendedor batendo > 110% da meta → 🟢
- `R14`: BU crescendo > 15% vs período anterior → 🟢
- `R15`: Cliente NPS subindo + tratativa fechada bem → 🟢

Cada `Insight` tem shape:
```ts
type Insight = {
  id: string;
  severity: 'critico' | 'atencao' | 'saudavel';
  category: 'vendedor' | 'bu' | 'cliente';
  subject: string; // "Maria Silva", "Modelo Atual", "Irrigamax"
  title: string; // "12 dias sem venda"
  metrics: { label: string; value: string; comparison?: string }[]; // ["8 vendas", "média: 12", "-33% vs mês anterior"]
  rule_id: string; // 'R1', 'R2', ...
  raw_context: Record<string, any>; // dados crus pra mandar pra IA
  ai_reasoning?: string; // preenchido depois pela IA
};
```

### 4. Camada de IA (híbrido)

Apenas para insights com severidade 🔴 (críticos), chamar `ai-chat` com prompt curto:
- Input: `raw_context` do insight + comparação período atual vs anterior
- Output esperado: 1-2 frases de "provável causa" em PT-BR

System prompt sugerido (adicionar em `src/lib/aiSystemPrompts.ts`):
```
Você é analista comercial sênior. Receberá um JSON com métricas de um vendedor/BU/cliente comparando período atual vs anterior. Em NO MÁXIMO 2 frases, em PT-BR, identifique a causa mais provável da anomalia e sugira 1 ação prática. Seja direto, sem floreio. Formato: "<causa em 1 frase>. <ação sugerida começando com verbo no infinitivo>."
```

Chamadas em paralelo (Promise.all) com cap de 10 simultâneas. Cache em memória (React Query) — staleTime 30min, mesma chave do insight.

**NÃO** chamar IA para 🟡 e 🟢 — texto da regra basta. Isso mantém custo baixo.

### 5. Salvar histórico de insights (fase opcional, mas faça)

Migration aditiva nova:

Tabela `commercial_insights_snapshots`:
- `id` uuid PK
- `user_id` uuid references auth.users — quem visualizou
- `period_start`, `period_end` timestamptz
- `insights` jsonb (array completo)
- `generated_at` timestamptz default now()

Só guarda snapshot quando usuário clica "Salvar leitura desta semana". Permite voltar e ver o estado de 2 semanas atrás. RLS: só vê os próprios snapshots.

**MIGRATION ADITIVA APENAS.** Nada de DELETE/DROP/UPDATE em dados existentes.

### 6. UI dos cards

Componente `InsightCard.tsx`:
- Borda colorida por severidade (vermelho/amarelo/verde)
- Header: ícone + título + chip da categoria
- Corpo: lista de métricas com comparação
- Footer: "Provável causa: <ai_reasoning>" (só pros críticos)
- Botão "Ver detalhes" abre Sheet lateral com dados crus + link pra abrir o vendedor/cliente no tab apropriado

Componente `InsightsTab.tsx`:
- Filtros no topo: severidade (chips multi), categoria (chips multi), busca por nome
- Toggle "Ver só meus" — closer vê só insights onde ele é o vendedor
- Lista virtualizada se passar de 50 itens (use `react-virtual` se já estiver no projeto, senão lista normal)
- Skeleton de loading com 6 cards placeholder

## Restrições

1. **Migration aditiva apenas** (REGRA ABSOLUTA): zero DELETE/DROP/TRUNCATE/UPDATE em dados existentes.
2. **Não alterar** hooks existentes. Apenas consumir.
3. **Não criar** edge function nova — use `ai-chat` que já existe.
4. **Não mexer** em outros tabs / outras permissões além do necessário pra liberar 'insights' pra admin+closer.

## Entrega em commits separados

1. **commit 1**: migration `commercial_insights_snapshots` + RLS
2. **commit 2**: `insightsEngine.ts` com todas regras R1-R15 + tipos + testes manuais via console.log
3. **commit 3**: componentes `InsightCard.tsx` + `InsightsTab.tsx` + adicionar aba ao `Planning2026.tsx`
4. **commit 4**: integração com IA via `ai-chat` para insights críticos
5. **commit 5**: snapshot/histórico (botão "Salvar leitura")

Rodar typecheck após cada commit. Não pushar se quebrar tipos.

## Validação esperada

- Abrir aba com filtro = mês corrente: deve aparecer pelo menos os críticos óbvios (vendedor 0 venda, BU < 50% meta)
- Trocar filtro pra semana: contagem e cards mudam
- Closer logado vê só insights onde ele é o vendedor (quando toggle "ver só meus" ligado)
- Insight crítico mostra "Provável causa: ..." escrito pela IA
- Insight amarelo/verde NÃO chama IA (sem custo desnecessário)
