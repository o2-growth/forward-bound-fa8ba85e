

## Diagnóstico: Por que os 8 cards não aparecem em Março no indicador RR

### Causa raiz identificada

Analisei os dados da planilha cruzando com a lógica do código em `useExpansaoAnalytics.ts` (linhas 272-367). O problema é um **bug na lógica de deduplicação**.

O código atual usa **FIRST ENTRY global** — ou seja, para cada card, guarda apenas a **primeira vez na vida** que ele entrou em "Reunião Realizada", independente do mês. Quando o filtro é Março, só aparecem cards cuja primeira RR foi em Março.

### Análise card a card

| Card | Produto | 1ª RR (global) | 2ª RR (Março) | Aparece em Março? | Motivo |
|------|---------|----------------|---------------|-------------------|--------|
| **Nathan** | Franquia | 21/01 | — | Não | 1ª RR em Janeiro, sem reentrada em Março |
| **Ruan** | Franquia | 18/02 | 11/03 | **Não (BUG)** | 1ª RR em Fev, reentrou em Mar mas código ignora |
| **Everton** | Franquia | 19/02 | 27/03 | **Não (BUG)** | 1ª RR em Fev, reentrou em Mar mas código ignora |
| **Ely** | Franquia | 18/02 | 13/03 | **Não (BUG)** | 1ª RR em Fev, reentrou em Mar mas código ignora |
| **Rafael B** | Franquia | 21/02 | 27/03 | **Não (BUG)** | 1ª RR em Fev, reentrou em Mar mas código ignora |
| **Kalléu** | Oxy Hacker | 11/03 | — | Sim (no Oxy Hacker) | 1ª RR em Março, aparece no Oxy Hacker |
| **Rafael Meireles** | Oxy Hacker | 18/03 | — | Sim (no Oxy Hacker) | 1ª RR em Março, aparece no Oxy Hacker |
| **Vera** | Oxy Hacker | 02/03 | — | Sim (no Oxy Hacker) | 1ª RR em Março, aparece no Oxy Hacker |

### Resumo

- **4 cards (Ruan, Everton, Ely, Rafael B)**: São Franquia e reentraram em RR em Março, mas o código usa a data da 1ª entrada (Fevereiro) e ignora a reentrada. **Este é o bug.**
- **3 cards (Kalléu, Rafael Meireles, Vera)**: São **Oxy Hacker**, não Franquia. Aparecem no tab Oxy Hacker mas não no Franquia.
- **1 card (Nathan)**: 1ª RR em Janeiro e sem reentrada em Março. Corretamente não aparece.

### Correção proposta

Alterar `firstEntryByCardAndIndicator` em `useExpansaoAnalytics.ts` para usar **deduplicação mensal** em vez de first-entry global:

- Chave de dedup: `cardId + indicator + mês calendário`
- Para cada card+indicador+mês, guardar apenas a primeira entrada daquele mês
- Quando filtrar por período, incluir qualquer entrada mensal que caia no período

Isso alinha com a regra já documentada: *"um card é contabilizado no máximo uma vez por fase dentro do mesmo mês calendário. Se um card reentrar na mesma fase em meses distintos, ele será contado em ambos os períodos."*

### Arquivo afetado

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useExpansaoAnalytics.ts` | Trocar `firstEntryByCardAndIndicator` de first-entry global para dedup mensal (linhas 272-296 e 356-368) |

