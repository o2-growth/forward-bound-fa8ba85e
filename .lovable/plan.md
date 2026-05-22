## Diagnóstico

### 1. Distribuição SaaS × Pontual está errada (131/2)

`src/components/planning/cs/VisaoGeralCS.tsx:49`:
```ts
const PONTUAL_PRODUCTS = ['Diagnostico', 'Turnaround', 'Valuation', 'Educacao'];
```
A comparação na linha 124 é `p.toLowerCase().includes(pp.toLowerCase())`, mas os produtos vindos do banco/Pipefy vêm **com acento**: `"Diagnóstico Estratégico"`, `"Diagnóstico"`, `"Educação"`. Como a lista local não tem acento, `"diagnóstico estratégico".includes("diagnostico")` → **false**, então quase ninguém é classificado como Pontual (só os 2 que casam por acaso em `Turnaround`/`Valuation`).

Pior: essa heurística diverge do critério já consolidado em `useJornadaData.ts` (`PONTUAL_ONLY_PRODUCTS` com acento + override "pontual-only quando todos os produtos são pontuais"), que produz exatamente o flag `mrr === 0 && pontual > 0` usado no `PipelineView`.

**Correção:** alinhar a Visão Geral ao mesmo critério do resto do app — um cliente é Pontual quando `mrr === 0 && pontual > 0` (sem recorrência, só receita pontual). Isso elimina o bug de acentos e dá consistência entre Pipeline / CFO / Visão Geral.

### 2. MRR Base hardcoded em R$ 724.400

`src/components/planning/CustomerSuccessTab.tsx:409`:
```tsx
mrrBase={724400}
```
Existe já um `const mrrBase` calculado na linha 260 a partir da carteira real (`filteredClientes.reduce((s, c) => s + c.mrr, 0)`), mas ele não está sendo passado — o valor mostrado no card "MRR Base" é fixo.

**Correção:** trocar `mrrBase={724400}` por `mrrBase={mrrBase}` para refletir o MRR real da carteira filtrada (mesma fonte usada pelos demais cards: Valor CFOaaS + Valor OXY dos clientes ativos, com overrides do Dago/Guará/Pedrolo já aplicados).

## Alterações

### `src/components/planning/cs/VisaoGeralCS.tsx`

Substituir o cálculo de `clientesByTipo` (linhas 119–130) por:
```ts
const clientesByTipo = useMemo(() => {
  let saas = 0;
  let pontual = 0;
  activeClientes.forEach(c => {
    // Pontual = sem recorrência (mesmo critério do PipelineView / useJornadaData)
    if (c.mrr === 0 && c.pontual > 0) pontual++;
    else saas++;
  });
  return { saas, pontual };
}, [activeClientes]);
```
Remover a constante `PONTUAL_PRODUCTS` (linha 49) que vira código morto. Atualizar o tooltip (linhas 254 e 283) para refletir o critério novo: "Pontual = cliente sem MRR recorrente (apenas receita pontual de Setup/Diagnóstico/Turnaround/Valuation/Educação)".

### `src/components/planning/CustomerSuccessTab.tsx`

Linha 409: trocar `mrrBase={724400}` por `mrrBase={mrrBase}`.

## Validação após o build

1. Card "MRR Base" da Visão Geral deve mostrar valor calculado da carteira (não mais R$ 724.400 fixo) e mudar conforme filtros de CFO/produto.
2. "Distribuição de Clientes Ativos → Por tipo de produto" deve mostrar uma divisão coerente — SaaS ~ clientes com CFOaaS/Oxy/Gênio, Pontual = só Diagnóstico/Turnaround/Valuation/Educação. Comparar com a coluna "Pontual" do `PipelineView` (mesma base).

## Fora de escopo

Não vou mexer em outras telas, no cálculo de health/NPS/churn nem no `mrrBase` global de outras abas — só os dois pontos pedidos da Visão Geral de Operação.
