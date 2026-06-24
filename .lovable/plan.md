## Diagnóstico

### Bug 1 — Modal "Composição do Squad" ignora o DRE

No `CfoView.tsx` há duas fontes para os números do squad:

- `getSquadCusto / getSquadFee / getSquadBeneficios` (linhas 263–268) → chamam `resolvePerson()` → leem do DRE real. **Funcionam.**
- `getSquad()` (linha 236) → retorna o objeto `CFO_SQUADS[cfoNome]` **hardcoded**. Nunca passa pelo DRE.

A linha 1468 do modal usa `getSquad(selectedCfo)` e renderiza `squad.fee` / `squad.beneficios` / `m.fee` / `m.beneficios` (linhas 1498–1510). Resultado:

- Gustavo CFO → mostra sempre **Fee R$ 20.000 + Benef R$ 740** (constantes), não muda com o filtro de mês.
- A coluna **Total** (R$ 28.085,07) e o P&L **estão corretos** porque usam `getSquadCusto/getSquadBeneficios`, que leem do DRE.

Por isso a soma não bate (20k+740+7k+987,60 = 28.727 ≠ 28.085).

### Bug 2 — "Mês atual só mapeia 4"

Hoje é 24/jun/2026. Para "mês atual", o DRE Oxy ainda tem só lançamentos parciais. Quem ainda não foi pago no mês some do mapeamento, e na UI aparece valor hardcoded ou pessoa fora do squad.

**Solução combinada (decisão do usuário):** quando uma pessoa do squad **não tem lançamento no mês selecionado**, puxar automaticamente o valor do **mês anterior**.

## Correções

### 1. Fallback "mês anterior" no hook (`useSquadCostFromDre.ts`)

Disparar uma 2ª rodada de drill-down em paralelo para o **mês anterior** ao `startDate`. Construir um segundo mapa `matchedByPessoaNomePrev` com o mesmo algoritmo (CPF → CNPJ → alias → nome).

No retorno, expor um helper:

```ts
const matchedByPessoaNomeWithFallback: Record<string, { fee, benef, total, fallback?: boolean }> = {};
for (const key of new Set([...Object.keys(matchedByPessoaNome), ...Object.keys(matchedByPessoaNomePrev)])) {
  const cur = matchedByPessoaNome[key];
  if (cur && (cur.fee > 0 || cur.benef > 0)) {
    matchedByPessoaNomeWithFallback[key] = cur;
  } else {
    const prev = matchedByPessoaNomePrev[key];
    if (prev) matchedByPessoaNomeWithFallback[key] = { ...prev, fallback: true };
  }
}
```

Atribuir esse mapa em `SQUAD_REAL_BY_PERSON` para o `resolvePerson` enxergar.

Range do "mês anterior": `start = subMonths(startOfMonth(startDate), 1)`, `end = subDays(startOfMonth(startDate), 1)`. Só executar se `startDate` for o mês corrente ou se o range cobrir só 1 mês (não disparar fallback em ranges longos tipo YTD para evitar dobrar custo).

Cache: `staleTime: 10 min`, mesmas categorias CaaS.

### 2. Modal usa valores reais por pessoa (`CfoView.tsx`, linhas 1481–1524)

Trocar a renderização para `resolvePerson()` em cada linha (CFO + cada membro). O total da modal passa a bater com o card lá fora. Quando o valor veio do fallback, mostrar badge sutil "mês anterior" do lado do número (cor muted).

```ts
const cfoP = resolvePerson(squad.nome, squad.fee, squad.beneficios);
const membrosResolvidos = squad.membros.map((m) => ({
  ...m,
  resolved: resolvePerson(m.nome, m.fee, m.beneficios),
}));
```

`resolvePerson` retorna `{ fee, benef, total, fallback? }` para a UI saber quando marcar.

### 3. Banner discreto no header da view

Se o range incluir o mês corrente, abaixo do filtro de período:

> "Junho/2026 ainda em curso. Pessoas sem lançamento até hoje usam o valor de Maio/2026."

## Resultado esperado

- Trocar mês → linhas individuais (Gustavo, Humberto, etc.) mostram fees/benefícios reais do mês.
- No mês corrente parcial, quem ainda não foi pago aparece com valor de maio + indicação "mês anterior".
- Total da modal bate com a soma das linhas e com o card.
- Contagem de "pessoas mapeadas" no mês corrente sobe (preenchida pelo fallback).

## Arquivos

- `src/hooks/useSquadCostFromDre.ts` — 2ª query do mês anterior + merge com flag `fallback`.
- `src/components/planning/jornada/CfoView.tsx` — modal usa `resolvePerson`, banner de mês parcial, badge "mês anterior" quando `fallback=true`.
