## Contexto

Você pediu para abrir as sub-categorias até "lançamento pessoa a pessoa". Testei toda a superfície conhecida da API Oxy (`/v2/dre/*`, `/v2/launches*`, `/v2/movements`, `/widgets/cash-flow/*` com `movimentType=D` e `categoryIds[]`) — nenhuma devolve lançamento por pessoa. A Oxy só expõe **grupo → categoria** com totais mensais.

Se você tiver o path correto (cole o link do doc ou abra o DevTools do app oxy.finance, clique numa categoria pra ver os lançamentos, e me passe a URL da chamada), eu adiciono em 5min. Sem isso, este é o melhor drill possível com o que existe hoje.

## O que vai aparecer dentro de cada BU (3 níveis)

Hoje BU → Categoria. Vou adicionar **Categoria → 2 painéis lado a lado:**

### Painel A — Evolução mensal da categoria (vem 100% da Oxy)

Mini-gráfico de barras com o valor mês a mês dentro do período selecionado. Os dados já vêm no payload de `dre_categories` (`data[].period`, `data[].value`) — zero chamada extra.

```text
Equipe CaaS                                 R$ 203k
─────────────────────────────────────────────
Mar │████████░░░░ R$ 65k
Abr │██████████░░ R$ 70k
Mai │█████████░░░ R$ 68k
```

### Painel B — Pessoas do Pipefy alocadas naquela BU (fallback de lançamento)

Lista nominal vinda da DB de Pessoas (Pipefy) cruzando `Time` ↔ BU pelo mapeamento que já temos em `timeToBu()`. Para cada pessoa: nome, cargo, data de admissão, tempo de casa.

**Sem valor por pessoa** — a Oxy não devolve. Mostro só o custo médio = `total da categoria ÷ headcount do Time`. Banner azul deixa explícito: "valor por pessoa é média aritmética, Oxy não expõe lançamento individual".

```text
Equipe CaaS  ·  6 pessoas · média R$ 33,8k/mês
─────────────────────────────────────────────
Ana Silva       Tech Lead       3a 2m
João Pedro      Dev Senior      1a 8m
Carla Souza     Dev Pleno       8m
...
```

## Implementação

### `usePersonnelCostByBu.ts`
- Já retorna `data[].period` e `data[].value` por categoria. Não muda fetch — só exponho a serie mensal junto com `valor` total no tipo `CategoriaPessoal`:
  ```ts
  interface CategoriaPessoal {
    label: string;
    valor: number;
    serie: { period: string; value: number }[]; // novo
  }
  ```

### `PessoasTab.tsx`
- Drill já tem 2 níveis (BU → categoria). Adiciono `openCategoria: string | null` para abrir o 3º nível.
- Ao expandir uma categoria, renderiza um grid `lg:grid-cols-2`:
  - **Painel A**: sparkline/barras mensais usando `Recharts` (já no projeto).
  - **Painel B**: filtra `hr.headcountByTime` por substring que mapeia pra mesma BU + casa com a lista de pessoas (`useHrData` já devolve `pessoas[]` se eu expor — checar/expor).

### Cruzamento Time→BU
- Reusa `timeToBu()` que já existe em `PessoasTab.tsx`.
- Para a categoria "Equipe CaaS" → BU "CaaS" → filtra pessoas onde `timeToBu(pessoa.time) === "CaaS"`.

### Sem mudança de DB / sem nova edge function
Todos os dados já estão no payload existente. Zero migração.

## O que NÃO vou prometer
- ❌ Valor exato por pessoa (Oxy não devolve).
- ❌ Lançamentos contábeis individuais (Oxy não devolve).
- ❌ Quebra abaixo de "categoria" (Oxy não devolve).

## Se você conseguir o endpoint depois
Mando a 4ª camada (Lançamento) em 5min: adiciono `dre_launches` na `fetch-oxy-finance` apontando pro path certo, e troco o Painel B por tabela real `Pessoa | Valor | Data`.
