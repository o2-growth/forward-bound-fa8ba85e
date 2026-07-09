## Objetivo

Cards em **Perdido** (fase atual, histórico de fase ou marcados como perda) não devem mais aparecer nos **Quentes / Mornos / Frios** nem entrar na **projeção de caixa** (Realista/Otimista) do dashboard Comercial.

## Onde muda

Um único ponto central: `src/components/planning/indicators/temperaturaAggregator.ts`. Ele alimenta tanto a **Seção Temperatura** quanto o **Cenário de Caixa**, então ajustar aqui resolve os dois locais de uma vez.

## Mudanças

1. **Match mais forte de "Perdido"**
   - `isLostPhase` passa a considerar também strings que começam com `perdido` / `perda` (ex.: "Perdido - Sem interesse", "Perda - ICP fora"), além dos valores exatos já cobertos.

2. **Checar histórico completo do card, não só a última linha**
   - Hoje o aggregator pega apenas a linha mais recente por `id` e só olha `card.faseAtual`.
   - Passa a inspecionar **todas as linhas** daquele `id` e exclui se qualquer uma tiver `faseAtual`, `fase` ou `faseDestino` em fase de perda.
   - Mesma lógica já usada em `hotOpportunityItems` no `IndicatorsTab.tsx` (linhas 3243–3290), garantindo consistência.

3. **Marcadores de perda explícitos**
   - Excluir também quando `card.perdido === true` (Monetização/Expansão já expõem esse flag) ou quando `card.motivoPerda` estiver preenchido em qualquer linha do card — sinal de que o lead foi perdido mesmo que a fase atual ainda apareça como intermediária.

4. **Monetização**
   - Já usa `card.perdido || card.ganho || isLostPhase(card.faseAtual)`. Estender com o novo `isLostPhase` (match por prefixo). Sem outra mudança de comportamento.

## Impacto

- **Seção Temperatura**: buckets Quente/Morno/Frio deixam de listar/contar cards perdidos.
- **Cenário de Caixa**: Realista (Quentes) e Otimista (Quentes+Mornos) recalculam sem esses cards, reduzindo a projeção quando havia perdidos inflando o total.
- Nenhuma mudança em métricas de funil, vendas realizadas, ou em outras BUs — só nos consumidores do aggregator.

## Fora de escopo

- Não alterar `CommercialPaceDashboard` (a "Projeção fim do período" ali é derivada só de `venda` realizada e o card "Oportunidades quentes" já tem exclusão própria em `IndicatorsTab.tsx`).
- Não alterar hooks de analytics por BU.

## Validação

- Abrir Indicadores → Comercial e conferir que a Seção Temperatura e o Cenário de Caixa não listam mais cards cuja fase atual/histórico seja Perdido.
- Confirmar via `useModeloAtualAnalytics`/`useExpansaoAnalytics` que a exclusão bate com os cards marcados como perda.
