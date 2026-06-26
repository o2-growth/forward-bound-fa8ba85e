## Problema

- Acelerômetro **Comercial → MQLs** mostra **215** (01–26/06/2026).
- Hero **Marketing → CPMQL** mostra **200 MQLs no período** (01–30/06/2026).

Mesmo com período maior, Marketing fica abaixo do Comercial — ou seja, **fontes diferentes**.

## Causa raiz

Em `src/components/planning/MarketingIndicatorsTab.tsx` (`pipefyVolumes`, linhas 484-501) cada BU conta MQLs assim:

```
counts.mqls += maGetCards('mql').length;
counts.mqls += o2GetCards('mql').length;
counts.mqls += franquiaGetCards('mql').length;  // analytics cards
counts.mqls += oxyGetCards('mql').length;       // analytics cards
```

Já o acelerômetro do Comercial em `IndicatorsTab.tsx` (`getRealizedForIndicator`, linhas 1057+), **sem filtros** de Closer/SDR/Origem, usa para Franquia e Oxy Hacker as funções **`getFranquiaQty(...)` / `getOxyHackerQty(...)`** (hooks de metas/sheets — fonte canônica de "realizado"). Os hooks de analytics de Franquia/Oxy aplicam regras diferentes (cumulativo, faixa de investimento etc.) e geram um total menor.

Resultado: as duas telas usam fontes distintas para as mesmas BUs → divergência.

## O que vai mudar

Alinhar `pipefyVolumes` em `MarketingIndicatorsTab.tsx` à **mesma lógica do acelerômetro Comercial sem filtros**, para todas as etapas usadas no hero/cards (leads, mqls, rms, rrs, propostas, vendas):

- **Modelo Atual** → `modeloAtualAnalytics.getCardsForIndicator(ind).length` (igual ao Comercial).
- **O2 TAX** → `o2TaxAnalytics.getDetailItemsForIndicator(ind).length` (igual ao Comercial).
- **Oxy Hacker** → `getOxyHackerQty(ind, startDate, endDate)` (substituindo `oxyGetCards`).
- **Franquia** → `getFranquiaQty(ind, startDate, endDate)` (substituindo `franquiaGetCards`).

Resto da tela (cards de atribuição, funil por fonte, drill-downs etc.) **continua** usando `*GetCards` porque depende dos cards individuais — só o contador agregado do hero e dos cards de etapa muda.

## Arquivos afetados

- `src/components/planning/MarketingIndicatorsTab.tsx`
  - Importar/usar `useOxyHackerMetas` e `useExpansaoMetas` (já existem no projeto e são usados pelo `IndicatorsTab`) para obter `getOxyHackerQty` e `getFranquiaQty`.
  - Reescrever o `useMemo` de `pipefyVolumes` (linhas ~484-501) usando a fonte acima.
  - Manter dependências corretas no array do `useMemo`.

## Validação

1. Abrir aba Marketing no mesmo período do print do Comercial (01–26/06/2026) e conferir se o número de MQLs no hero CPMQL bate com o acelerômetro (215).
2. Conferir também Leads, RM, RR, Propostas e Vendas batendo com os acelerômetros do Comercial sem filtros.
3. Verificar que CAC/CPMQL e demais cálculos derivados (que dividem investimento por essas quantidades) refletem os novos valores.
