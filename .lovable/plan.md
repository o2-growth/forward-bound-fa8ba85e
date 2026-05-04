## Bug

Na tabela de "Resultado da simulação" (Aba CFO), a Margem Bruta e Margem % são calculadas como `(MRR - Custo Squad)` / `MRR`, **ignorando os 18% de impostos**. No dialog de P&L do mesmo arquivo a fórmula correta já existe (`computeMargem` + `IMPOSTOS_RATE = 0.18`).

## Correção

Em `src/components/planning/jornada/CfoView.tsx`, no `useMemo` `simResult` (linhas ~358-398):

1. Adicionar nova linha **"Impostos (18%)"** logo abaixo de **"Receita (MRR)"**, mostrando `-mrr * 0.18` para atual e simulado.
2. Adicionar linha **"Receita Líquida"** (= MRR × 0.82) para deixar explícito.
3. Recalcular `atualMargemBruta` / `simMargemBruta` como `receitaLiquida - custoSquad` (em vez de `mrr - custoSquad`).
4. Recalcular `atualMargem` / `simMargem` usando o helper já existente `computeMargem(mrr, custoSquad)` para garantir consistência com o P&L do dialog.

Ordem final das linhas:
- Clientes
- Receita (MRR)
- Impostos (18%)  ← nova
- Receita Líquida ← nova
- Receita (Pontual)
- Custo Squad
- Margem Bruta (agora líquida de impostos)
- Margem %
- Ticket Médio

## Arquivo afetado

- `src/components/planning/jornada/CfoView.tsx` — apenas o bloco `simResult` (~15 linhas). Sem mudança em hooks, banco ou outros componentes.

## Garantias

- Mudança 100% local de UI/cálculo apresentacional.
- Fórmula passa a bater com o P&L do dialog (`computeMargem`), eliminando inconsistência.
- Sem efeito em outras abas, hooks de dados, persistência ou metas.
