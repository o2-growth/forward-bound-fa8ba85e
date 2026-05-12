
## Objetivo
Usar a tabela `mrr_base_monthly` como **fonte única de verdade** do MRR Base na tabela do Modelo Atual (Plan Growth), em vez de derivar de seed projetado com churn.

## Valores reais já no banco (2026)
- Jan: R$ 705.268,07
- Fev: R$ 746.847,17
- Mar: R$ 733.281,13
- Abr: R$ 700.152,57
- Mai a Dez: ainda não existem na tabela

## Comportamento

**Coluna "MRR Base" do Modelo Atual:**
1. Para cada mês, ler diretamente de `mrr_base_monthly` (via hook `useMrrBase` já existente).
2. Se o mês existe na tabela → usar o valor exato (real Oxy).
3. Se não existe (meses futuros, hoje Mai–Dez/26) → projetar a partir do **último mês disponível** aplicando **5% de churn ao mês**:
   - Mai/26 = Abr × 0,95 = R$ 665.145
   - Jun/26 = Mai × 0,95
   - … e assim por diante até Dez/26.

**Coluna "Gap"** (badge ⚠️ por mês):
- Continua mostrando diferença entre o MRR Base atual e o que seria a projeção pura desde Jan (mês × 0,95). Serve só para sinalizar variações vs. modelo teórico.

**Linha "Gap a Realocar" (abaixo de Dezembro):**
- Mantém comportamento atual: soma os gaps dos meses fechados, mostrando saldo a realocar manualmente em "A Vender".

## Reversibilidade
- Os arquivos `.bak-2026-05-12` de `MediaInvestmentTab.tsx` e `usePlanGrowthData.ts` permanecem. Backup do `mrr_base_monthly_backup_20260512_pre_churn` está intacto.
- Nenhuma escrita em banco — só mudança de leitura no frontend.

## Arquivos a alterar (frontend apenas)

### `src/hooks/usePlanGrowthData.ts`
- Importar `useMrrBase` (já existe).
- Substituir o atual cálculo de `mrrBaseRealPorMes` (que faz `seed × 0,95` e depois aplica churn) por:
  - Para Jan–Dez/2026: `getMrrBaseForMonth(month, 2026)`.
  - Se `0` (não existe): pegar o último mês com valor e aplicar `× 0,95^n`.
- Remover a constante local `CHURN_OXY = 0.05` da derivação inicial (ainda usada para projetar futuro).

### `src/components/planning/MediaInvestmentTab.tsx`
- Mesma mudança no cálculo de `mrrBaseRealPorMes` (linhas ~1091–1108).
- A coluna "MRR Base" continua exibindo o valor real (já implementado nas linhas ~1418–1473).
- A linha "Gap a Realocar" e gauges não mudam.

## Validações
- Mar/26 deve mostrar **R$ 733.281** (não R$ 709.504).
- Abr/26 deve mostrar **R$ 700.153** (não R$ 696.617).
- Mai/26 (futuro) projeta = R$ 700.153 × 0,95 = **R$ 665.145**.
- Total anual e Gap Row recalculam automaticamente.

Sem alterações em banco, edge functions ou outros componentes.
