## Objetivo

Hoje os clientes desses 3 produtos aparecem na "Distribuição de Clientes Ativos" com **MRR = 0** e **Pontual = 0**, porque a Central de Projetos não tem campos `Valor BPO / Assessoria / Coordenador`. Os valores reais vivem nos 3 pipes dedicados (`pipefy_moviment_bpo`, `pipefy_moviment_assessoria_financeira`, `pipefy_moviment_coordenador_financeiro`).

Vamos puxar esses valores e injetar no cliente correspondente da Central de Projetos.

## O que muda

### 1) Edge Function — `query-external-db` (nova action `active_products_values`)

Uma única chamada que retorna, para cada um dos 3 pipes, as linhas **ativas** (`"Saída" IS NULL`), agregadas por card (`ID`), com:

- `cnpj` (normalizado: só dígitos)
- `empresa` (normalizado: trim/lowercase/sem acento)
- `titulo`
- `produto_origem`: `'BPO' | 'Assessoria Financeira' | 'Coordenador Financeiro'`
- `mrr`: valor recorrente do produto (campo `valor_bpo` / `valor_assessoria` / `valor_coordenador*`)
- `pontual`: soma de `valor_setup + valor_diagnostico + valor_turnaround + valor_valuation + valor_educa_o` (mantém regra global de NÃO somar `valor_educa_o` se essa for a política — confirmar no código atual; default: somar tudo exceto Educação)
- `setup`: `valor_setup` isolado (para futura segregação)

Antes de implementar, a função vai validar o schema dos 3 pipes para descobrir o nome exato da coluna do MRR do Coordenador (no schema do BPO já existem `valor_bpo` e `valor_assessoria`, mas Coordenador pode ter outro nome — vou inspecionar e fazer fallback seguro).

### 2) Hook `useJornadaData.ts` — enriquecimento dos clientes

Após carregar clientes da Central de Projetos:

1. Chama a edge function nova (cacheada por 5 min).
2. Para cada linha retornada, monta a chave de match:
   - **prioridade 1**: CNPJ normalizado (só dígitos)
   - **prioridade 2**: empresa normalizada
3. Acha o `JornadaCliente` correspondente e **soma**:
   - `mrr += pipe.mrr`
   - `pontual += pipe.pontual`
   - adiciona `pipe.produto_origem` em `produtos` (se ainda não estiver lá) e atualiza `produto` para refletir os novos
4. Linhas dos pipes que **não casarem** com nenhum cliente da Central são guardadas num array separado (`clientesSoltosBPO`) — não viram cliente fantasma, mas ficam disponíveis para um aviso/diagnóstico no card de Distribuição ("12 cards no pipe BPO sem match na Central de Projetos").

### 3) `VisaoGeralCS.tsx` — breakdown "Por produto"

- Reaproveita o `clientesByProduto` atual (já desenrolando vírgula/+).
- Adiciona uma coluna `MRR` ao lado de `Clientes`/`%` para que dê para enxergar o valor real puxado dos pipes.
- Tooltip do card explica: "Valores de BPO/Assessoria/Coordenador vêm dos pipes dedicados (Pipefy). Match por CNPJ → empresa."
- Se houver `clientesSoltosBPO.length > 0`, mostra rodapé discreto: `⚠ N cards desses pipes sem match na Central de Projetos.`

## Detalhes técnicos

```text
Edge Function (Postgres externo)
────────────────────────────────
action = "active_products_values"

WITH active_bpo AS (
  SELECT DISTINCT ON ("ID")
    "ID", "Título", cnpj, empresa,
    COALESCE(valor_bpo, 0)       AS mrr,
    COALESCE(valor_setup, 0)
      + COALESCE(valor_diagnostico, 0)
      + COALESCE(valor_turnaround, 0)
      + COALESCE(valor_valuation, 0) AS pontual,
    COALESCE(valor_setup, 0)     AS setup,
    'BPO'                        AS produto_origem
  FROM pipefy_moviment_bpo
  WHERE "Saída" IS NULL
  ORDER BY "ID", "Entrada" DESC
)
-- idem para assessoria e coordenador, UNION ALL
```

Match no front:
```ts
const onlyDigits = (s: string) => (s || '').replace(/\D+/g, '');
const norm = (s: string) =>
  (s || '').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

const byCnpj = new Map<string, JornadaCliente>();
const byEmpresa = new Map<string, JornadaCliente>();
clientes.forEach(c => {
  if (c.cnpj) byCnpj.set(onlyDigits(c.cnpj), c);
  byEmpresa.set(norm(c.titulo), c);
});
```

## Fora de escopo

- Não vamos criar "clientes fantasma" para cards de pipes sem match na Central (apenas contagem informativa).
- Não vamos mexer em DRE, metas, gauges monetários, churn, NPS — só nos dados do cliente exibidos no card "Distribuição de Clientes Ativos" (e, por consequência, em qualquer lugar que leia `cliente.mrr` / `cliente.pontual`).
- Não vamos persistir nada no Supabase próprio — leitura direta dos 3 pipes externos a cada refresh.