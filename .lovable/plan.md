## Problema

Hoje, no funil de vendas, um mesmo card pode contar **2 vezes no mesmo mês** porque o pipe do Pipefy tem duas fases finais (`Contrato assinado` → `Ganho`), e a deduplicação atual é por `id|fase|mês` em vez de `id|mês`.

Exemplo concreto Maio/26 Modelo Atual: aparecem **33 movimentações** mas são **19 vendas reais únicas** (14 cards passaram pelas duas fases dentro de Maio).

## Solução

Mudar a chave de deduplicação da contagem de venda para `id|mês`, escolhendo **uma única linha por card por mês** com a seguinte prioridade:

1. Se o card foi pra `Ganho` no mês → usa essa linha
2. Senão, usa a linha de `Contrato assinado`

A data efetiva continua sendo `Data de assinatura do contrato` (regra existente, não muda).

## Escopo

Aplicar em **todas as 4 BUs**:
- Modelo Atual
- O2 TAX
- Oxy Hacker (já é só Contrato assinado — sem mudança real, só padronizar)
- Expansão (Franquia)

## Arquivos a alterar

| Arquivo | O que muda |
|---------|-----------|
| `src/hooks/useModeloAtualAnalytics.ts` | `getCardsForIndicator('venda')` → dedup por `id|mês`, preferindo `Ganho` |
| `src/hooks/useModeloAtualMetas.ts` | Contagem de venda no funil mensal → mesma dedup |
| `src/hooks/useO2TaxAnalytics.ts` | Mesma dedup |
| `src/hooks/useO2TaxMetas.ts` | Mesma dedup |
| `src/hooks/useExpansaoAnalytics.ts` | Mesma dedup |
| `src/hooks/useExpansaoMetas.ts` | Mesma dedup |
| `src/hooks/useClosersMetas.ts` | Contagem de venda por closer → mesma dedup (para Rank Closer não inflar) |

## O que NÃO muda

- **Valores monetários** (MRR / Setup / Pontual / Faturamento) — já agregam só de `Ganho` (Modelo Atual / O2 TAX) ou só de `Contrato assinado` (Expansão), não somam as duas fases. Sem risco de duplicação financeira.
- **Funil das outras fases** (Leads, MQL, RM, RR, Proposta) — regra atual de dedup `id|fase|mês` permanece.
- **Data de atribuição ao mês** — continua `Data de assinatura do contrato` quando preenchida.

## Impacto esperado nos números

- Contagem de **vendas no funil** vai cair (Modelo Atual Maio/26: 33 → 19; padrão similar nos outros meses e BUs).
- Conversão **Proposta → Venda** vai ficar mais coerente (não passa de 100% por causa de duplicação).
- Rank de Closer/SDR por número de vendas vai refletir vendas únicas.
- **Receita realizada não muda** (gauges monetários intactos).

## Detalhes técnicos

Padrão a aplicar em cada hook de Analytics (`getCardsForIndicator('venda')`):

```text
1. Filtrar movimentações em (Contrato assinado, Ganho) com effectiveTime no período
2. Agrupar por (id, mês-do-effectiveTime)
3. Para cada grupo: manter linha com fase = 'Ganho' se existir, senão 'Contrato assinado'
4. Retornar lista resultante
```

Padrão a aplicar em cada hook de Metas (contagem mensal):

```text
Mesmo agrupamento por (id, mês) — incrementar contador 1x por card único no mês,
em vez de 1x por movimentação.
```

Após a mudança, atualizar a memória `Sales Phase Universal Definition` indicando que ambas as fases continuam válidas para detectar venda, mas a **contagem é deduplicada por card+mês**.
