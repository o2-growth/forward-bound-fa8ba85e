# Ajuste de metas da Bruna (Closer) — Julho/2026

Aplicar somente ao mês **Jul/2026**. Demais meses ficam inalterados.

## O que muda

### 1. `src/hooks/useCloserMetas.ts` — adicionar Bruna como closer de Oxy Hacker
```ts
BU_CLOSERS = {
  ...
  oxy_hacker: ['Pedro Albite', 'Daniel Trindade', 'Bruna'],  // + Bruna
  franquia:   ['Pedro Albite', 'Daniel Trindade', 'Bruna'],  // já está
}
```
Sem isso, o rateio da Bruna em Oxy Hacker é ignorado pelo `getFilteredMeta`.

### 2. Tabela `closer_metas` (rateio %) — apenas month = 'Jul', year = 2026
Upsert:
- `franquia / Jul / Bruna` → **100**
- `franquia / Jul / Pedro Albite` → **0**
- `franquia / Jul / Daniel Trindade` → **0**
- `oxy_hacker / Jul / Bruna` → **100**
- `oxy_hacker / Jul / Pedro Albite` → **0**
- `oxy_hacker / Jul / Daniel Trindade` → **0**

### 3. Tabela `closer_absolute_metas` (metas absolutas RM/RR/Prop/Venda/Faturamento) — apenas Jul/2026
O `getFilteredMeta` só considera closers com meta absoluta > 0 no mês (guard `absoluteMetaIndex`). Para o pace da Bruna aparecer, precisa existir linha absoluta dela em Jul para as duas BUs.

- Somar as linhas absolutas de Jul de **Pedro Albite + Daniel Trindade + Bruna (se existir)** em `franquia` → gravar o total em `Bruna / franquia / Jul` e zerar as linhas de Pedro e Daniel nesse mês/BU.
- Mesmo procedimento em `oxy_hacker`.

Campos consolidados: `rm_meta`, `rr_meta`, `prop_meta`, `venda_meta`, `faturamento_meta`.

## Execução
Migration SQL única cobrindo os 2 upserts (closer_metas + closer_absolute_metas) + edição do `BU_CLOSERS` no hook. Nenhum outro mês é tocado. Nenhuma tela precisa mudar — os componentes já leem esses hooks.

## Riscos
- Se houver closer absoluto em Jul de Oxy Hacker que hoje não está no `BU_CLOSERS`, ele deixa de ser somado (esperado, já que a Bruna absorve).
- Reversível: basta rodar upsert restaurando os valores anteriores (posso gerar snapshot antes).
