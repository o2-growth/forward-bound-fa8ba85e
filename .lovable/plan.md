# Aba Marketing: novas seções (Cohort + Curva + Online/Offline + CAC)

Replicar EXATAMENTE 4 abas da planilha `Indicadores Growth.xlsx` dentro do dashboard, na aba **Marketing** (`MarketingIndicatorsTab.tsx`). Não inventar coluna nova nem mudar fórmula — espelhar o que está na planilha.

CPV = CAC (fica de fora, vai depois).

---

## Stack relevante

- Aba Marketing: `src/components/planning/MarketingIndicatorsTab.tsx`
- Hooks que JÁ trazem os dados crus:
  - `useModeloAtualAnalytics`, `useOutboundAnalytics`, `useExpansaoAnalytics`, `useO2TaxAnalytics` — vendas (cards)
  - `useMetaCampaigns`, `useGoogleCampaigns` — investimento de mídia
  - `useMarketingAttribution` — atribuição
- Filtro de data global: `dateRange` já propagado
- Classificador de fonte: `src/lib/leadSource.ts`

---

## SEÇÃO 1 — Cohort de Entrada

**Definição (replicar exato):** cada linha = 1 venda. Agrupada pela safra do mês de **`dataEntrada`** (mês em que o lead foi criado no funil).

### Visualização

Tabela expansível por safra. Linha do cabeçalho da safra (colapsada por padrão) mostra agregados; expandindo aparecem as vendas individuais.

### Colunas (espelhar planilha)

| Coluna | Fonte do dado |
|---|---|
| Safra | mês de `dataEntrada` formatado "Fevereiro 2024", "Março 2024", ... |
| Cliente | `card.titulo` ou `card.empresa` |
| Criado em | `card.dataEntrada` |
| Fonte | `card.tipoOrigem` ou `card.origemLead` ou `card.fonte` (a categorização "Site/Redes Sociais", "Meta Ads", "Google Ads", "Prosp. Ativa", "Ind. Parceiro", "Ind. Prospect", "Colaborador O2", "Cliente", "Instagram", "LinkedIn", "Matéria Exame", "Globo Internacional") |
| Investimento | spend Meta + Google do **mês de entrada** (linha de cabeçalho da safra) |
| Produto | `card.produto` |
| MRR | `card.valorMRR` |
| MRR Total | SUM dos MRR das vendas da safra (linha de cabeçalho) |
| Setup | `card.valorSetup` |
| Setup Total | SUM dos Setup da safra |
| Pontual | `card.valorPontual` |
| Pontual Total | SUM dos Pontual da safra |
| Educação | `card.valorEducacao` |
| Educação Total | SUM dos Educação da safra |
| Faturamento | MRR Total + Setup Total + Pontual Total + Educação Total (cabeçalho da safra) |
| CAC | `Investimento ÷ nº de vendas da safra` (cabeçalho) |
| Contrato assinado | `card.dataAssinatura` |

### Comportamento

- Ordenar safras desc (mais recente primeiro) ou asc — copiar o que dá menos atrito visual
- Linhas individuais ordenadas por `dataEntrada` asc dentro da safra
- Filtro de data global da aba filtra QUAIS safras aparecem (se range = Q1 2024, mostra safras Jan/Fev/Mar 2024)
- Vendas vêm de TODAS as BUs (Modelo Atual + Outbound + Franquia + Oxy Hacker + O2 TAX)

---

## SEÇÃO 2 — Cohort de Assinatura

**Definição:** igual à Cohort de Entrada, **mas a safra é o mês de `dataAssinatura`** (não `dataEntrada`).

### Diferenças importantes vs Cohort de Entrada

- Coluna `Safra` = mês de `Contrato assinado`
- Coluna `Criado em` aparece no FIM (a planilha inverte a ordem)
- Investimento da safra = investimento do **mês de entrada do lead** (NÃO o mês da assinatura). Replicar essa lógica mesmo sendo contra-intuitiva — é o que a planilha faz e o user já validou.
- `Faturamento` inclui Educação (a planilha de Entrada bugada não incluía, a de Assinatura inclui). **Usar a versão correta com Educação.**
- CAC mesma fórmula: `Investimento ÷ nº de vendas da safra`

### Implementação

Componente reutilizável `CohortTable.tsx` que recebe prop `cohortType: 'entrada' | 'assinatura'` e troca o campo de agrupamento. Evita duplicar código.

---

## SEÇÃO 3 — Curva de Conversão

**Definição (replicar exato):** mostra quantos dias cada venda demorou da entrada até a assinatura. Dois KPIs gigantes no topo + tabela embaixo.

### KPIs topo

| KPI | Cálculo |
|---|---|
| **Média (dias)** | `mean(diasAteFechar)` de todas vendas do período |
| **Mediana (dias)** | `median(diasAteFechar)` de todas vendas do período |

A diferença grande entre média e mediana (planilha mostra 35 vs 14) indica cauda longa. Exibir os dois lado a lado, em cards grandes.

### Tabela

| Coluna | Fonte |
|---|---|
| Cliente | `card.titulo` ou `card.empresa` |
| Criado em | `card.dataEntrada` |
| Contrato assinado | `card.dataAssinatura` |
| Dias até fechar | `dataAssinatura - dataEntrada` em dias |

- Ordenar por "Dias até fechar" desc por padrão (vendas mais demoradas em cima — anomalias visíveis)
- Vendas vêm de TODAS as BUs
- Filtro de data global filtra por `dataAssinatura` dentro do range

---

## SEÇÃO 4 — Conversão Online vs Offline

**Definição (replicar exato):** taxa de conversão Leads → Vendas, segmentada por canal e agrupada em Online / Offline.

### Agrupamento

**ONLINE:**
- Meta Ads
- Google Ads
- Site/Redes Sociais
- Globo Internacional
- Instagram
- LinkedIn
- Matéria Exame

**OFFLINE:**
- Colaborador O2
- Ind. Parceiro
- Ind. Prospect
- Cliente
- Prosp. Ativa

Helper: `src/lib/marketingChannelGroup.ts` com função `getChannelGroup(fonte: string): 'online' | 'offline' | 'desconhecido'`.

### Visualização

**Topo — 2 cards lado a lado:**

```
┌─ Online ───────────────┐  ┌─ Offline ──────────────┐
│ 1.357 leads             │  │ 16 leads                │
│ 35 vendas               │  │ 12 vendas               │
│ 2,58% conversão         │  │ 75% conversão           │
└─────────────────────────┘  └─────────────────────────┘
```

**Embaixo — Tabela detalhada por fonte (replicar Tabela B da planilha):**

| Fonte | Grupo | Leads | Vendas | Taxa de Conversão |
|---|---|---|---|---|

Ordenar por Leads desc. Mostrar todas as fontes que tiverem pelo menos 1 lead OU 1 venda no período.

### Adicional (não tem na planilha mas é grátis dado o dado)

Card "Investimento por grupo":
- Online: R$ X (Meta + Google do período)
- Offline: R$ 0 (não temos como medir custo de indicação)

---

## SEÇÃO 5 — CAC (consolidado)

Não cria seção própria — o CAC já aparece em cada safra de cohort. Adicionar **apenas 1 card no topo da aba Marketing** mostrando:

```
CAC Total (período filtrado)
R$ 6.842
———
Investimento: R$ 245.700  ÷  Vendas: 36
```

Fórmula: `(spend Meta + spend Google no período) ÷ (nº de vendas no período, vindas de qualquer fonte)`.

---

## Onde colocar tudo na aba Marketing

Ordem da aba (de cima pra baixo):

1. **PerformanceGauges** (já existe)
2. **Card CAC Total** (Seção 5) — NOVO
3. **RevenueMetricsCards** (já existe)
4. **Conversão Online vs Offline** (Seção 4) — NOVO
5. **Curva de Conversão** (Seção 3) — NOVO
6. **Cohort de Entrada** (Seção 1) — NOVO
7. **Cohort de Assinatura** (Seção 2) — NOVO
8. Resto do que já existe (channel cards, campaign tables, etc.)

---

## Restrições

1. **NÃO mexer** em hooks/cálculos existentes — apenas consumir.
2. **NÃO criar** edge function nova.
3. **NÃO mexer** em outras abas.
4. **Filtro de data global** da aba Marketing precisa funcionar em TODAS as 4 seções novas.
5. **Vendas** = todas as BUs (Modelo Atual + Outbound + Franquia + Oxy Hacker + O2 TAX).
6. **Investimento** = Meta + Google APENAS (não temos outras fontes de custo).
7. Performance: usar `useMemo` em todas as agregações pesadas (cohort tem ~400 linhas).

---

## Entrega em commits separados

1. **commit 1**: helper `marketingChannelGroup.ts` + tipos compartilhados em `marketing-indicators/types.ts`
2. **commit 2**: card CAC Total no topo da aba
3. **commit 3**: Conversão Online vs Offline (cards + tabela)
4. **commit 4**: Curva de Conversão (KPIs + tabela)
5. **commit 5**: Cohort de Entrada (tabela expansível)
6. **commit 6**: Cohort de Assinatura (reusar `CohortTable` com prop)

Rodar typecheck após cada commit. Não pushar se quebrar.

## Validação

- Filtro de data = ano corrente: números devem ser comparáveis aos da planilha
- Trocar pra Q1 2024: cohort mostra só safras Jan/Fev/Mar
- Curva de Conversão: média e mediana batem com `mean()` e `median()` dos `dataAssinatura - dataEntrada`
- Online: soma das vendas das fontes do grupo = total online
- CAC = (spend Meta + Google) ÷ vendas, com decimais corretos
