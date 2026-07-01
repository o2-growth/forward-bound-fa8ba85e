## Resultado do teste ponta a ponta da última modificação (Visão CEO)

Rodei as três frentes contra a API real do Oxy Finance (jun/2026):

### ✅ 1. DRE completo (P&L) — `DreSection`
Os **codes** que o `PL_ORDER` referencia batem 1:1 com o que a API devolve em `/v2/dre/dre-table`:
`RECEITA BRUTA, DC, RECEITA LÍQUIDA, CUSTOS VARIÁVEIS, LUCRO BRUTO, DESPESAS FIXAS, EBITDA, RF, DF, RNO, DNO, PROV, RESULTADO LÍQUIDO, AD, INV, RESULTADO FINAL` — todos existem na resposta. Renderiza corretamente com AV%.

### ✅ 2. Inadimplência — `FinanceiroSection` / `useOxyReceivables`
`cashflow_details` com `movimentType=R&isLate=true` retornou **44 clientes vencidos** em jun/2026 (ED TREINAMENTO, WR DISTRIBUIDORA, PGS, OdontoCompany, Data Stone, …). Cards e tabela top-15 funcionam.

### ❌ 3. Principais saídas — `CaixaSection` / `useOxyExpenses`
`cashflow_details` com `movimentType=D` **retorna `data: []` em todos os cenários testados** (jun/26, mai/26, ano-inteiro, tanto com CNPJ formatado quanto "clean"). Ou seja, o card "Principais saídas do período" vai sempre mostrar **"Sem saídas registradas no período."** — a última alteração não está funcional na prática.

Também testei `dre_drill_down` para `DX`/`CV`/`DC` como plano B e também veio vazio — esse endpoint da Oxy não expõe o detalhe.

---

## Correção proposta

Trocar a fonte de "Principais saídas" para dados que **já temos em memória** via `useOxyFinance().dreLines` — o DRE devolve todas as linhas de despesa por rótulo (Custos CaaS, Custos SaaS, Custos Customer Success, Despesas de Marketing, Despesas Comerciais, Despesas com Pessoal, Despesas Administrativas, Despesas Financeiras, Amortização da Dívida, Investimentos etc). É a mesma fonte do P&L, garantindo consistência entre as abas.

### Passos
1. **`src/hooks/useOxyExpenses.ts`** — reescrever para derivar do `dreLines` já carregado em `useOxyFinance`:
   - Filtrar linhas com `code ∈ {CV, DX, DF, DNO, AD, INV, PROV}` (todas as saídas do P&L).
   - Recortar por `startDate..endDate` (mês a mês da chave `byMonth`).
   - Retornar `items = [{ label, total, byMonth }]` já ordenados por `total desc`.
   - Descontinuar a chamada extra à edge function `cashflow_details?movimentType=D`.
2. **`src/components/planning/ceo/CaixaSection.tsx`**
   - Ajustar o texto/`MetricSource` para: *"Oxy Finance — DRE (todas as linhas de custo/despesa: CV, DX, DF, DNO, AD, INV, PROV)"*.
   - Continuar mostrando top-20 + agregado "+ N outros".
3. **`supabase/functions/fetch-oxy-finance/index.ts`** — nada a mudar (o endpoint só é chamado por `useOxyReceivables`, que funciona).

### Como validar depois
- Abrir Indicadores → Visão CEO → aba Caixa → seção "Principais saídas do período" deve listar rubricas do DRE (Despesas Comerciais, Despesas com Pessoal, Custos CaaS etc.) com valores > 0 para o período filtrado.
- Somatório do card "Total de saídas (período)" deve bater com `Custos Variáveis + Despesas Fixas + DF + DNO + AD + INV + PROV` do P&L exibido na aba DRE — ficam com a mesma fonte, então consistência é automática.
- Alternar `dateRange` (ex.: só mai/2026) deve alterar valores.

Se preferir manter a intenção original (top de **fornecedores** individuais, não só rubricas contábeis), me diga e a gente investiga outro endpoint da Oxy — mas hoje `cashflow_details?movimentType=D` não devolve essa granularidade.
