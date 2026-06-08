# Dedup de Reunião Marcada (RM) por título normalizado + mês

## Problema

No drill-down de **Reunião agendada / Qualificado** em Modelo Atual/Jun-2026, cards distintos no Pipefy (IDs diferentes) representam o mesmo cliente reaberto/recadastrado e contam 2x. Casos confirmados:

- Kopu (1227194784 + 1360806670)
- Núcleo (976231563 + 1365789446)
- José Edson Pascaol Filho (1361675259 + 1362514316)
- G4 Pic pay (1365680160 + 1365683470)

Hoje a dedup existe só para **venda** (por id+mês). Para RM não há dedup por título.

## Mudança

Aplicar dedup adicional para `indicator='rm'` em `getCardsForIndicator` e `getDetailItemsForIndicator`:

- **Chave:** `normalize(titulo) + ano-mês da dataEntrada`
- **Normalize:** trim, lowercase, NFD sem acentos (regra já existente em `mem://logic/indicators/string-normalization-rules`)
- **Critério de preferência** ao escolher 1 entre N duplicatas no mesmo mês:
  1. Maior `dataEntrada` (entrada mais recente — reflete reagendamento)
  2. Em empate, manter o de menor ID (estável)
- **Escopo:** somente RM. Não muda Leads, MQL, RR, Proposta nem Venda.
- **Aplicação:** Modelo Atual + O2 TAX (Expansão já dedup por `card+indicator+mês` via `monthlyFirstEntries`, mas títulos diferentes; fica fora do escopo a menos que você queira incluir).

## Onde mexer

- `src/hooks/useModeloAtualAnalytics.ts` → bloco `getCardsForIndicator('rm')` (adicionar dedup pós-filtro, igual ao padrão do `venda`)
- `src/hooks/useO2TaxAnalytics.ts` → mesmo bloco para `'rm'`
- Atualizar memória `mem://logic/indicators/sales-monthly-card-dedup` (renomear/ampliar) para incluir a regra de RM por título+mês

## Impacto esperado

- Modelo Atual / Jun-2026: 42 → ~38 RMs
- Reflete em: card "Qtd Reuniões Marcadas", drill-down do funil, e nos gráficos diários/semanais (a contagem do dia da duplicata removida cai 1)
- **Não** afeta metas, valores monetários, conversões com base no mesmo numerador (taxa RM→RR vai melhorar levemente)

## Validação

Após a mudança, conferir no preview que:
- Modelo Atual / Jun-2026 mostra ~38 RMs
- Drill-down não lista mais 2 linhas "Kopu", "Núcleo", "G4 Pic pay" ou "José Edson"
- Maio/2026 (referência anterior) não muda significativamente (sanity check)
