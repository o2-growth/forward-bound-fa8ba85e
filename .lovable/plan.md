## Contexto

Hoje toda a carteira da Mari é tratada como serviço pontual: o cliente só aparece na carteira no mês da assinatura e some no mês seguinte. Funciona pra Diagnóstico/Turnaround/Valuation, mas não pra **Assessoria Financeira**, que é um produto recorrente com fee mensal.

A Central de Projetos (`pipefy_central_projetos`) não tem coluna pro valor de Assessoria — esse valor vive no pipe externo `pipefy_moviment_assessoria_financeira` (coluna `valor_assessoria`). Por isso hoje o sistema nem enxerga esses clientes corretamente.

Investiguei: a memória do projeto já descreve esse comportamento como "desejado", mas o código atual **não** tem nenhum enriquecimento por pipe dedicado nem a ação `pipes_active_aggregated`. Vamos implementar.

## O que muda

### 1. Edge Function `query-external-db` — nova ação `pipes_active_aggregated`

Adicionar bloco que faz:

```sql
SELECT DISTINCT ON ("ID")
  "ID", "Título", "Fase", "Fase Atual", "Entrada",
  "Data de assinatura do contrato",
  COALESCE("valor_assessoria", 0) AS valor_mrr,
  'Assessoria Financeira' AS produto_origem
FROM pipefy_moviment_assessoria_financeira
WHERE "Saída" IS NULL
ORDER BY "ID", "Entrada" DESC
```

Retorna `{ rows: [{ id, titulo, fase, dataAssinatura, valorAssessoria, produto_origem }] }`.

Escopo agora: só Assessoria Financeira (BPO/Coordenador ficam pra depois — não foi pedido). Estrutura fica pronta pra UNION ALL futuro.

### 2. `src/hooks/useJornadaData.ts` — enriquecer carteira da Mari

- Nova query (`useQuery`) que chama `query-external-db` action `pipes_active_aggregated`.
- Após montar `clienteMap` da Central de Projetos, fazer um pass de enriquecimento:
  - Normalizar título (`trim + lowercase + NFD sem acentos`).
  - Para cada linha do pipe, achar cliente Mari correspondente por título.
  - Quando casar:
    - somar `valorAssessoria` em `cliente.mrr`,
    - acrescentar `'Assessoria Financeira'` em `cliente.produto`,
    - marcar flag interna `temAssessoriaFinanceira = true`.
  - Cards sem match: log `console.warn` (mesma postura da memo, não viram cliente fantasma).

### 3. Regra de carteira da Mari (linha ~605 do hook e ~789 do `CfoView.tsx`)

Substituir:

```ts
if (isMariClient(c.cfo) || isPedroloClient(c.cfo)) {
  return isAssinaturaNoMesPassado(c.dataAssinatura);
}
```

Por:

```ts
if (isPedroloClient(c.cfo)) {
  return isAssinaturaNoMesPassado(c.dataAssinatura);
}
if (isMariClient(c.cfo)) {
  // Assessoria Financeira: recorrente → fica na carteira todo mês
  if (c.temAssessoriaFinanceira) return true;
  // Diagnóstico/Turnaround/Valuation: só no mês da assinatura
  return isAssinaturaNoMesPassado(c.dataAssinatura);
}
```

Mesma substituição em `CfoView.tsx` `activeClientes`.

### 4. Receita agregada do CFO (linha ~629)

Mantém `mrr + pontual` pra Mari — fórmula já funciona pros dois casos:
- Cliente puro Assessoria: `mrr` (assessoria) + `pontual` (0).
- Cliente puro Diagnóstico: `mrr` (0) + `pontual` (diagnostico).
- Cliente com os dois: soma correta dos dois.

Nada a mudar aqui.

### 5. Tipo `JornadaCliente`

Adicionar `temAssessoriaFinanceira?: boolean` em `src/components/planning/jornada/types.ts`.

## Validação

1. Console log `[Mari pipe-enrich]` mostrando `total_cards_pipe`, `matched`, `unmatched`.
2. Aba Jornada → CFO Mariana: clientes de Assessoria Financeira devem aparecer mês após mês, com MRR correto.
3. Clientes só de Diagnóstico continuam aparecendo apenas no mês da assinatura (comportamento atual preservado).
4. MRR total da Mari = soma de assessoria mensal + diagnósticos do mês.

## Fora de escopo

- BPO e Coordenador Financeiro (a memo menciona, mas você não pediu agora — implementação futura é trivial: adicionar UNION ALL na mesma ação).
- Alterar lógica do Pedrolo.
- Atualizar memo `mem://logic/operations/bpo-assessoria-coordenador-values` — faço após a implementação rodar OK.