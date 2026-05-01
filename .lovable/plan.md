## Objetivo

Na tabela de clientes que aparece ao clicar no card de um CFO (ex: Everton) na aba **Jornada → CFOs**, tornar os cabeçalhos de coluna **clicáveis** para ordenar a lista — incluindo ordem alfabética por Cliente, e numérica/categórica nas demais.

## Escopo

Apenas a tabela do dialog em `src/components/planning/jornada/CfoView.tsx` (linhas ~1268-1284), com as colunas:

- **Cliente** (alfabética A→Z / Z→A)
- **Status** (Risco → Novo → Controlado e inverso)
- **Produto** (alfabético pelo primeiro produto)
- **Fase** (alfabético)
- **Fee Mensal** (numérico)
- **Pontual** (numérico)
- **Health** (numérico)
- **NPS** (numérico, com `null` no fim)
- **Tratativa** (sim/não)

## Comportamento

- Clique no cabeçalho ordena ascendente; segundo clique inverte para descendente.
- Indicador visual (ícone `ArrowUp` / `ArrowDown` / `ArrowUpDown` neutro) ao lado do label, igual ao padrão já usado na tabela comparativa de CFOs (linhas ~1042-1065).
- Padrão inicial: ordenado por **Fee Mensal desc** (mantém o comportamento atual `b.mrr - a.mrr`).
- Ordenação puramente client-side, sem mudanças em hooks ou lógica de negócio.

## Detalhes técnicos

1. Substituir o `useMemo` de `dialogClientes` (linha ~737-740) por:
   - `dialogClientesBase` = `activeClientes.filter(c => c.cfo === selectedCfo)` (sem sort fixo).
   - Novo estado: `clientSortCol` (string) e `clientSortAsc` (boolean), default `'feeMensal'` / `false`.
   - Novo `useMemo` `dialogClientes` que aplica o sort dinâmico sobre `dialogClientesBase`.

2. Mapa de extratores de valor por coluna (para manter o sort consistente):
   - `cliente` → `c.titulo` (string, `localeCompare` com `'pt-BR'`, `sensitivity: 'base'`).
   - `status` → ordem fixa `risco=0, novo=1, controlado=2` via `deriveStatus(c)`.
   - `produto` → `(c.produtos[0] ?? '')` (string).
   - `fase` → `c.faseAtual` (string).
   - `feeMensal` → `c.mrr` (number).
   - `pontual` → `c.pontual` (number).
   - `health` → `c.healthScore` (number).
   - `nps` → `c.npsScore ?? -Infinity` no asc / `+Infinity` no desc para empurrar nulos ao fim.
   - `tratativa` → `c.tratativaAtiva ? 1 : 0`.

3. Atualizar os `<TableHead>` das linhas ~1274-1282 para virar botões clicáveis usando o mesmo padrão da tabela comparativa (linhas 1042-1065): `onClick={() => toggleClientSort(col)}`, com `cursor-pointer select-none` e ícone à direita.

4. Helper `toggleClientSort(col)`: se já é a coluna ativa, inverte `clientSortAsc`; senão define `clientSortCol = col` e usa um default sensato (`false`/desc para numéricos, `true`/asc para strings).

## Fora de escopo

- Não alterar `useJornadaData.ts` nem nenhuma regra de negócio (fases ativas, status de churn, cálculo de health etc.).
- Não mexer na tabela comparativa de CFOs (já tem sort).
- Não adicionar filtro/busca nesta iteração — apenas ordenação.

## Validação

- Abrir o dialog do Everton, clicar em "Cliente" → ordem alfabética; clicar de novo → inversa.
- Clicar em "Health" → menores no topo; de novo → maiores no topo.
- Clicar em "NPS" → clientes sem NPS vão para o fim em ambos sentidos.
