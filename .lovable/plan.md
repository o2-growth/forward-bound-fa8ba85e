## Diagnóstico

Confirmado via Playwright: a tabela **"Funil — realizado x meta e conversão"** (aba Indicadores › Visão CEO › Comercial) está renderizando **11 linhas em vez de 6** — Leads/MQLs/Reuniões agendadas/Reuniões realizadas/Propostas aparecem duplicadas (uma "cópia fantasma" sem realizado + a linha oficial).

O código atual (`src/components/planning/ceo/ComercialSection.tsx`, `useMemo` a partir da linha 134) devolve `FUNNEL_STAGES.map(...)` — que deveria dar exatamente 6 entradas. A duplicação em runtime aponta para memoização/HMR retornando uma referência antiga concatenada, e não há defesa contra isso hoje (o `key={r.real}` só evita warning, não remove a linha).

## Correção

`src/components/planning/ceo/ComercialSection.tsx`

1. Reescrever o `useMemo` do funil para montar as linhas a partir de um **Map indexado por `real`**, garantindo uma linha por estágio mesmo se o input duplicar:
   ```ts
   const byStage = new Map<string, Row>();
   for (const s of FUNNEL_STAGES) {
     byStage.set(s.real, { ...s, real: realTotals[s.real] || 0, meta: metaTotals[s.meta] || 0, ... });
   }
   const rows = FUNNEL_STAGES.map(s => byStage.get(s.real)!);
   ```
2. Alterar o render (linha 315) para iterar `FUNNEL_STAGES` diretamente e buscar o dado por estágio (`funil.byStage[s.real]`), tornando impossível render extra:
   ```tsx
   {FUNNEL_STAGES.map((s) => {
     const r = funil.byStage[s.real];
     return <TableRow key={s.real}>...</TableRow>;
   })}
   ```
3. Como saneamento, chavear também por `label` para blindar contra qualquer regressão futura.

## Validação

Rodar Playwright na sub-aba CEO › Comercial e confirmar que a tabela do funil tem **exatamente 6 linhas** (Leads, MQLs, Reuniões agendadas, Reuniões realizadas, Propostas, Vendas) — sem cópias fantasmas.
