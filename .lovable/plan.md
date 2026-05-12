
## Ajustes em Plan Growth (MediaInvestmentTab)

### 0. Backup antes de qualquer alteração
Antes de implementar, criar snapshots das tabelas que podem ser afetadas indiretamente pela mudança de churn (recálculo de MRR/A Vender exibido) e de qualquer dado que o usuário possa querer restaurar:

```sql
CREATE TABLE funnel_metas_backup_20260512_v3_pre_churn AS
  SELECT * FROM funnel_metas;

CREATE TABLE bu_indicators_config_backup_20260512_v2_pre_churn AS
  SELECT * FROM bu_indicators_config;

CREATE TABLE mrr_base_monthly_backup_20260512_pre_churn AS
  SELECT * FROM mrr_base_monthly;
```

Aplicar via migration com RLS de leitura apenas para admins (mesmo padrão dos backups anteriores).
Também serão mantidos os arquivos `.bak` dos componentes alterados (`MediaInvestmentTab.tsx.bak-2026-05-12`, `usePlanGrowthData.ts.bak-2026-05-12`) para reverter o frontend rapidamente caso necessário.

### 1. Renomear coluna "DRE Total" → "Faturamento Oxy"
No bloco **Consolidado Anual** (`MediaInvestmentTab.tsx:2762`):
- Alterar header `DRE Total` para `Faturamento Oxy`.
- Mantém toda a lógica (continua somando `dreByBU` das 4 BUs) — apenas o rótulo muda.

### 2. Funil de Vendas Projetado 2026 — minimizável e fechado por padrão
Seção a partir de `MediaInvestmentTab.tsx:2642`:
- Envolver o bloco inteiro (`Consolidado 2026` + grid das 4 BUs) em um `Collapsible` shadcn.
- `defaultOpen={false}` (entra minimizado ao abrir a página).
- Header com chevron, padrão visual igual ao do "Consolidado Anual" (`consolidadoOpen` em 1023).

### 3. Churn Modelo Atual: 6% → 5%
Três ocorrências:
- `usePlanGrowthData.ts:362` → `0.06` ⇒ `0.05`.
- `MediaInvestmentTab.tsx:358` (default param `churnMensal = 0.06`) ⇒ `0.05`.
- `MediaInvestmentTab.tsx:1069` (`useState(0.06)`) ⇒ `useState(0.05)`.
- Input/slider de churn permanece editável; só muda o default.

### 4. Linha de **Gap** no Modelo Atual (entre Dez e Total)
No `BUInvestmentTable` da Modelo Atual (renderizado em 2903), adicionar nova `TableRow` posicionada **depois de Dezembro e antes de Total**.

**Comportamento:**
- A linha "Gap" aparece **apenas** quando `buKey === 'modelo_atual'` (nova prop `metaAnualFixa?: number` no componente; quando definida, renderiza a linha de Gap).
- Constante: `const META_ANUAL_MODELO_ATUAL = 22_250_000;`
- Cálculo:
  - `somaAVender = sum(faturamentoVender de Jan..Dez após edições)`.
  - `gap = META_ANUAL_MODELO_ATUAL - somaAVender`.
- Exibição:
  - Label: **"Gap a Realocar"** + tooltip "Diferença entre meta anual (R$ 22,25M) e a soma realocada nos meses".
  - Apenas a coluna `A Vender` preenchida (vermelho se `gap > 0`, verde se `gap = 0`); demais colunas `—`.
  - Fundo `bg-destructive/10` quando `gap > 0`, `bg-emerald-50` quando `gap = 0`.
- Linha **Total** continua somando todos os meses + a linha de Gap → sempre fecha em **R$ 22.250.000**.

**Realocação dentro da mesma BU:**
- Sem nova UI de drag/realocar — usa o fluxo já existente: usuário edita "A Vender" de qualquer mês futuro e o Gap diminui em tempo real.
- Quando `gap === 0`, a linha mostra ✓ "Tudo realocado" em verde.

### Validações finais
- MRR Base inicial Mar/Abr 2026 segue R$ 667.987 (memória do projeto).
- Total Modelo Atual no rodapé exibe R$ 22.250.000 mesmo com gap > 0.
- Ajustes de churn (5%) e do gap row são apenas projeção/UI — não alteram dados persistidos em `funnel_metas`.
