## Objetivo
Excluir também da contagem de Quente/Morno/Frio os cards cuja **fase atual** é `Ganho` ou `Contrato assinado` (venda já fechada não deve aparecer no pipeline quente).

## Mudança
Arquivo único: `src/components/planning/indicators/temperaturaAggregator.ts`

1. Adicionar set `WON_PHASES = {"ganho", "contrato assinado"}` e helper `isWonPhase(fase)` usando o mesmo `normalize()` já criado.
2. No loop principal (Modelo Atual / Outbound / Franquia / Oxy Hacker): além do `isLostPhase`, pular também `isWonPhase(card.faseAtual)` — não conta em nenhum bucket nem em `semTag`.
3. No bloco de Monetização: pular cards com `faseAtual === "Concluído"` (equivalente a Ganho neste pipe — `card.ganho === true` já existe) além das checagens atuais.

## Fora de escopo
Acelerômetro de vendas e Cenário de Caixa continuam contando vendas normalmente — a exclusão é só na seção Temperatura.
