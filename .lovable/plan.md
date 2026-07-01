## Diagnóstico — o que está (e o que não está) vindo do Oxy DRE hoje na Visão CEO

### ✅ Já puxa do Oxy Finance / DRE detalhado
- **Aba Pessoal** → Receita por setor (CaaS, SaaS, TAX, Expansão) usa `useOxyFinance` (`caasByMonth`, `saasByMonth`, `dreByBU.o2_tax`, `expansaoByMonth`). Correto.
- **Aba DRE** → Receita Bruta (RB) por BU mês a mês, via `dreByBU`. Correto, mas **só a linha de RB**.
- **Aba Caixa** → Entradas / Saídas / Saldo / Acumulado via `cashflowChart`. Correto.

### ⚠️ Não puxa do Oxy hoje, mas deveria (ou faz sentido puxar)
1. **Financeiro (Inadimplência / Base de recebíveis)**
   Hoje mostra só Ativos/Churn do Pipefy Central de Projetos. Não tem nada de contas a receber.
   → O endpoint `cashflow_details` do Oxy (já implementado em `fetch-oxy-finance`) aceita `movimentType=R` + `isLate=true`, o que resolve inadimplência por prazo/categoria/cliente direto do Oxy.

2. **DRE completo (P&L, não só RB)**
   Hoje só expõe Receita Bruta. O bloco "Aguardando fonte" pede DRE completo — mas a Oxy já devolve os outros códigos (`DA`, `MC`, `DO`, `EBITDA`, `RL`) no mesmo endpoint `/v2/dre/dre-table`. O parser em `useOxyFinance` filtra `code !== 'RB'` e descarta tudo.
   → Alterando o parser para preservar as demais linhas, dá pra montar: Deduções, Custo variável, **Margem de contribuição**, Despesas operacionais, **EBITDA**, **Resultado líquido**, com análise vertical (% sobre receita) — sem depender de nova fonte.

3. **Caixa — detalhamento de saídas e Previsto x Realizado**
   Hoje só tem o gráfico agregado. O `cashflow_details` (movimentType=D) devolve saídas por categoria/subcategoria/fornecedor + `expected` vs `paid` → cobre "principais saídas" e "previsto x realizado" que estão como "Aguardando fonte".

4. **Comercial — Realizado do card "Previsto x Realizado + Pace"**
   Hoje soma `sumVendaValue` do Pipefy (regime de assinatura de contrato). Isso é o certo para o comercial. Mas vale adicionar uma **linha comparativa "Receita contábil (Oxy DRE)"** ao lado, pra CEO ver a divergência entre "vendido" (Pipefy) e "reconhecido" (Oxy). Opcional.

### ✅ Não faz sentido puxar do Oxy
- **Aba Comercial (pipe em negociação, funil, temperatura, metas de etapa)** → é operação de CRM; Pipefy é a fonte correta. Manter como está.

---

## Plano de mudanças (só se você aprovar)

### Fase 1 — DRE completo do Oxy (alto impacto, baixo esforço)
- Ajustar `useOxyFinance` para expor `dreLinesByCode` (Map de `code → { label, byBU/byMonth }`) preservando `DA`, `MC`, `DO`, `EBITDA`, `RL` além de `RB`.
- Reescrever `DreSection.tsx`: nova tabela com linhas Receita Bruta → Deduções → Receita Líquida → Custo variável → **Margem de contribuição (%)** → Despesas operacionais → **EBITDA (%)** → **Resultado líquido (%)**, com totais e análise vertical.
- Remover o bloco "Aguardando fonte — DRE completo".

### Fase 2 — Inadimplência real na aba Financeiro
- Criar `useOxyReceivables` que chama `fetch-oxy-finance` com `action=cashflow_details, movimentType=R, isLate=true` no período.
- Novo bloco em `FinanceiroSection`: total inadimplente, buckets por prazo (7/15/30/60/90/120/180/360/720/+720), quebra por BU, por produto, por CFO.
- Manter Ativos/Churn como estão (Pipefy).

### Fase 3 — Caixa detalhado
- Bloco "Principais saídas" (top categorias/subcategorias/fornecedores) via `cashflow_details, movimentType=D`.
- Bloco "Previsto × Realizado" do mês (usa `expected` vs `paid` do mesmo endpoint).
- Projeções 30/60/90: usa `cashflow_details` com janela futura.

### Fase 4 (opcional) — Comparativo Pipefy × Oxy na aba Comercial
- No card "Previsto x Realizado + Pace", adicionar sublinha "Receita contábil (Oxy DRE) no período: R$ X" com badge de divergência vs Pipefy.

---

## O que preciso de você

1. **Aprovar as Fases 1–3** (recomendo todas, são complementares).
2. **Fase 4 é opcional** — quer o comparativo Pipefy vs Oxy no card comercial? (Pode gerar dúvida com o time comercial que só olha Pipefy.)
3. Confirmar se a estrutura de códigos do DRE Oxy que a API devolve hoje inclui `MC` e `EBITDA` no mesmo endpoint `/v2/dre/dre-table` — se não, precisamos de uma chamada extra. Posso confirmar rodando um probe rápido antes de codar a Fase 1.
