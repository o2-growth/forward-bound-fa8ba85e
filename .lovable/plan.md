## Objetivo

Forçar os 8 cards específicos a serem contabilizados como venda em **Abril/2026** (mês passado), ignorando qualquer data de movimentação ou de assinatura no Pipefy.

## Cards alvo

- **Expansão**: JEAN MORBIS, MONICA SPINELLI, RICARDO REIS, ALEXANDRE CORREA, ELIZETH
- **Modelo Atual**: EDIOURO, COTRIM ENTERPRISES, FUJITEC

Identificação por correspondência no Título (case e acento insensitive), reusando a lista já existente em `dateUtils.ts`.

## Regra

Para qualquer card cujo título corresponda à lista, sobrescrever a `dataEntrada` (data efetiva da venda) para uma data fixa dentro de Abril/2026 (ex.: `2026-04-15`). Isso garante:

- Conta como venda em Abril/2026 em todos os KPIs, gráficos e drill-downs
- Independe de movimentação/assinatura registrada no Pipefy (resolve o caso onde `Data de assinatura do contrato` está `null`)
- Nenhum outro card é afetado

## Mudanças técnicas

1. **`src/hooks/dateUtils.ts`**
   - Manter a lista `FORCE_ASSINATURA_TITLES` e a função `shouldForceAssinaturaDate` (mesmos nomes para minimizar diff).
   - Adicionar constante `FORCED_SALE_DATE = new Date(2026, 3, 15)` (mês 3 = Abril em JS) e helper `getForcedSaleDate()`.

2. **Hooks de Expansão** (`useExpansaoMetas.ts`, `useExpansaoAnalytics.ts`)
   - Substituir o bloco atual de override (que hoje seta `dataEntrada = dataAssinatura`) por:
     ```
     if (shouldForceAssinaturaDate(titulo, 'expansao')) {
       dataEntrada = getForcedSaleDate(); // 2026-04-15
     } else {
       dataEntrada = fixPossibleDateInversion(dataAssinatura, dataEntrada);
     }
     ```
   - Aplicar o mesmo bloco também nos pontos onde a fase é **`Ganho`** (não só `Contrato assinado`), para cobrir cards que pularam direto para Ganho.

3. **Hooks de Modelo Atual** (`useModeloAtualMetas.ts`, `useModeloAtualAnalytics.ts`)
   - Mesma substituição nos blocos de override existentes na fase `Contrato assinado`.

## Comportamento esperado depois

- Os 8 cards aparecerão somados em Abril/2026 nas métricas de venda, MRR, Setup, Pontual e nos gráficos por mês das respectivas BUs.
- Todos os demais cards continuam com a lógica padrão (`fixPossibleDateInversion` entre data de movimentação e data de assinatura).
- Funciona mesmo com `Data de assinatura do contrato` ausente no Pipefy.
