# Correção do drill-down "Vendas – Análise de Valor (TCV)"

## Diagnóstico

Dois bugs distintos no modal do acelerômetro de Vendas do mês atual:

### 1) Coluna "Empresa" vazia nas linhas de Monetização
`useMonetizacaoAnalytics.toDetailItem` popula apenas `name`, não `company`. O `DetailSheet` usa a coluna `company` (linha 2322 do `IndicatorsTab.tsx`), então Cross-sell, Troca de produto e Upsell aparecem com "-".

Também não popula `dataAssinatura` nem `dataCriacao`, o que zera "Data Assinatura" e "Ciclo" para todos os cards de Monetização.

### 2) Turnaround (e Valuation/Diagnóstico) sempre com R$ 0
No `useModeloAtualAnalytics.parseCardRow`:

```ts
const valor = valorMRR + valorPontual + valorSetup;
```

A soma **ignora** `Valor Turnaround`, `Valor Valuation` e `Valor Diagnóstico Estratégico`. Cards da Oxy cujo valor está apenas nessas colunas (ex.: GARD COMÉRCIO – Turnaround, R$ na coluna "Valor Turnaround") entram com `valorPontual = 0`, TCV = 0 e ainda aparecem no drill-down "porque o classificador de produto os marcou como Turnaround".

O mesmo vale para o Outbound (mesma estrutura de leitura).

## Plano de correção

### `src/hooks/useModeloAtualAnalytics.ts`
1. Em `parseCardRow`, ao ler os valores:
   - Manter `valorMRR` / `valorSetup` como estão.
   - Somar em `valorPontual` os valores de produtos one-off da Oxy quando `Valor Pontual` estiver vazio: `Valor Turnaround`, `Valor Valuation`, `Valor Diagnóstico Estratégico`, `Valor OXY` (se ainda não contabilizados). Preservar o valor de `Valor Pontual` original quando existir (usar `Math.max` ou soma controlada para não duplicar em cards que já preenchem os dois campos).
   - Recalcular `valor = valorMRR + valorPontual + valorSetup`.
2. Em `hydrateOpenCardsWithHistory`, hidratar também `valoresExtras.valorTurnaround/valuation/diagnostico` com o `Math.max` histórico e reaplicar a mesma regra de agregar em `valorPontual` no card hidratado (para o pipeline aberto no Cenário de Caixa continuar consistente).

### `src/hooks/useOutboundAnalytics.ts`
Aplicar a mesma inclusão de `Valor Turnaround / Valuation / Diagnóstico` no cálculo de `pontual` (Outbound consome o mesmo tipo de row).

### `src/hooks/useMonetizacaoAnalytics.ts`
No `toDetailItem` (linha ~436):
- Adicionar `company: card.titulo || card.cliente || card.id`.
- Adicionar `dataCriacao: latest['Data Criação'] || undefined` (precisa expor `dataCriacao` no `MonetizacaoCard`).
- Adicionar `dataAssinatura` quando `card.ganho`, usando `card.entrada` (ou `latest['data_de_faturamento_1']` / `data_de_faturamento` quando disponível).
- Expor esses campos no tipo `MonetizacaoCard` e populá-los no `map(...)` que constrói cada card (linha ~377), lendo `Data Criação` da linha `latest`.

### Nada muda em `IndicatorsTab.tsx`
As colunas já estão corretas — só precisamos preencher os campos.

## Validação

1. Reabrir "Vendas – Análise de Valor (TCV)" e confirmar:
   - Cada linha de Cross-sell / Troca de produto / Upsell agora mostra o nome da empresa.
   - Cards de Monetização ganhos mostram data de assinatura e ciclo > 0d quando aplicável.
   - Turnaround (GARD COMÉRCIO e demais) passa a mostrar o valor real em Pontual e TCV.
2. Conferir no Cenário de Caixa que cards Turnaround/Valuation/Diagnóstico (Modelo Atual/Outbound) agora entram com valor (regra pontual × 50%).
3. Conferir que cards que já tinham `Valor Pontual` preenchido não tiveram duplicação de valor.
