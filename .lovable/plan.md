## Diagnóstico

DB `closer_absolute_metas` para Thiago 2026:
- **Mai**: rm=44, rr=37, prop=33, venda=5, faturamento=50.000
- **Jun**: rm=0, rr=0, prop=0, venda=0, **faturamento=100.000** ← só faturamento
- **Jul**: rm=0, rr=0, prop=0, venda=0, faturamento=200.000

Duas correções necessárias:

## Correção 1 — Semântica do override de closer

Hoje meu código só aciona o override quando `valor > 0`. Isso mostra a meta cheia da BU quando o campo está zerado, dando a falsa impressão de que Thiago tem meta de 487 MQL/195 RM.

**Nova regra**: se o closer tem QUALQUER meta cadastrada no ano (`hasAnyMetaInYear=true`), essa tabela vira fonte da verdade. Meses/campos zerados retornam 0 (o admin não cadastrou aquele indicador para o mês). Se o closer não aparece em nenhum mês do ano, cai no fluxo antigo.

Efeito: com Thiago selecionado em Jun, MQL/RM/RR/Prop/Venda mostram meta = 0 (admin não preencheu). Isso deixa visualmente óbvio que falta cadastrar.

## Correção 2 — Faturamento por closer

Aplicar `faturamento_meta` no gauge **Fat Incremento** quando um closer é filtrado:
- Se o closer tem `faturamento_meta > 0` em algum mês do período → soma rateada por dias vira a meta do gauge Fat Incremento.
- MRR/Setup/Pontual: por enquanto mantém rateio antigo (`closer_metas` %). São gauges com decomposição própria que exigiria split adicional — fora deste escopo.

## Onde mexer

**`src/components/planning/IndicatorsTab.tsx`**

1. Novo helper `hasCloserAnyAbsMeta(closer, year)` → `true` se existe alguma linha do closer com algum campo > 0 no ano.
2. `getCloserAbsoluteMetaForPeriod` passa a retornar `hasData=true` quando `hasCloserAnyAbsMeta(closer, year)` for true para pelo menos um dos closers selecionados (mesmo que o field somado no período seja 0).
3. Idem para `getCloserAbsoluteMetaForMonth`.
4. Novo helper análogo para `faturamento_meta`: `getCloserAbsFaturamentoForPeriod(closers, start, end)`.
5. No cálculo da meta de **Fat Incremento** (localizar por `getMetaMonetaryForPeriod` / `getConsolidatedMeta`), se closer selecionado e `hasCloserAnyAbsMeta` para algum → usar `getCloserAbsFaturamentoForPeriod` no lugar do rateio %.

## Validação (que vou executar após aplicar)

1. TypeScript check.
2. Rodar Playwright no preview: filtrar Modelo Atual + Thiago no mês Jun/2026, tirar screenshot, e confirmar:
   - Fat Incremento **Meta ≈ R$ 100k** (rateado ao número de dias selecionados).
   - MQL/RM/RR/Prop/Venda **Meta = 0** (admin não cadastrou para Jun).
   - Trocar para Mai/2026 e confirmar RM=44, RR=37, Prop=33, Venda=5.

Só finalizo o turno depois de confirmar visualmente os números.

## Fora do escopo

- Split de MRR/Setup/Pontual por closer (fica no rateio antigo).
- MQL (`closer_absolute_metas` não tem `mql_meta`).
