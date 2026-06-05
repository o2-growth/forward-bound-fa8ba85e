## Diagnóstico

Caso ESPÓLIO DE MÁRCIO LOUZADA CARPENA confirmado no banco:
- `Valor Diagnostico = 45.000` (correto, é o pontual real)
- `Valor CFOaaS = 15.000` (fee mensal Assessoria Financeira)
- Campo `Produtos` no Pipefy = só "Diagnóstico Estratégico" (Assessoria vive em pipe separado)

**Por que aparece 60k de pontual hoje** (`useJornadaData.ts` linhas 388–404):

```ts
isPontualOnly = produtoParts.every(p => PONTUAL_ONLY_PRODUCTS.includes(p));
// "Diagnóstico Estratégico" sozinho → true
pontual = valorDiagnostico + (isPontualOnly ? valorCfoaas : 0);
// 45.000 + 15.000 = 60.000  ❌
```

O CFOaaS é jogado no pontual porque a detecção de Assessoria só acontece depois, no pipe-enrich (linhas 539–583). Resultado: pontual fica inflado em 15k e o MRR também recebe 15k via `valor_assessoria` (o 15k acaba contado duas vezes em telas que somam mrr+pontual).

**Segunda regra (cliente híbrido)**: hoje, se `temAssessoriaFinanceira = true`, o cliente fica na carteira da Mari todo mês e `receitaCliente = mrr + pontual` (linha 699) — ou seja, o pontual continua sendo somado todo mês ao invés de só no mês da entrada.

## Mudanças

### 1. `src/hooks/useJornadaData.ts` — detectar Assessoria ANTES de classificar produtos

- Antes do loop principal de `projetos` (antes da linha 373), construir um `Set<string>` `titlesComAssessoria` com títulos normalizados (NFD) que aparecem em `pipesActiveData.rows` com `produto_origem === 'Assessoria Financeira'`.
- Dentro do loop, se o título normalizado do projeto estiver nesse set, adicionar `'Assessoria Financeira'` em `produtoParts` antes de calcular `isPontualOnly`. Isso faz `isPontualOnly = false` para o Espólio → `pontual = 45k`, `mrr = 0 + 15k (do pipe-enrich) = 15k`.
- O bloco pipe-enrich existente (539–583) continua somando `valor_mrr` em `cliente.mrr` e marcando `temAssessoriaFinanceira` — sem mudança lá.

### 2. `src/hooks/useJornadaData.ts` — agregação da Mari (linhas 660–702)

Alterar a regra de receita da Mari para que **pontual só conte no mês da assinatura**:

```ts
} else if (isMariClient(c.cfo)) {
  const pontualValido = isAssinaturaNoMesPassado(c.dataAssinatura) ? (c.pontual ?? 0) : 0;
  receitaCliente = c.mrr + pontualValido;
}
```

Carteira da Mari (665–677) já está correta:
- `temAssessoriaFinanceira` → sempre na carteira (MRR recorrente)
- Demais (puro pontual) → só no mês da assinatura

### 3. `src/components/planning/jornada/CfoView.tsx` — espelhar a regra (linhas 778–800)

A função `activeClientes` já mantém clientes com Assessoria todo mês. Onde houver soma de receita da Mari nessa view, aplicar a mesma regra "pontual só no mês da assinatura". Verificar todos os locais que somam `c.mrr + c.pontual` para Mari e gatear o pontual com `inMesPassado(c.dataAssinatura)`.

### Resultado esperado

Espólio (assinou em mês ≠ mês passado):
- pontual exibido no card = **45k** (correto)
- mrr exibido = **15k** (correto, recorrente da Assessoria)
- contribuição na receita da Mari = só 15k (pontual já expirou)

Se um cliente híbrido assinar este mês passado:
- mês atual: receita = 15k MRR + 45k pontual = 60k
- meses seguintes: receita = só 15k MRR (recorrente até churn)

### Fora de escopo

- Pipes BPO / Coordenador (continuam só Assessoria por enquanto).
- Pedrolo, override de Dago, Guará — sem mudança.
- Memos.
