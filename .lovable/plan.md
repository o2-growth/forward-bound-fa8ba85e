## Objetivo

Permitir salvar metas de "A Vender" mesmo quando o total anual por BU não fecha exatamente com a meta original, transformando a trava atual em **aviso** (não-bloqueante). Isso desbloqueia os valores redondos de Jun–Dez para o Modelo Atual (550k / 600k / 700k×3 / 600k).

## Mudanças no código

**Arquivo:** `src/components/planning/MediaInvestmentTab.tsx`

1. **`handleSaveAll` (linhas 1942–1946)** — remover o `return` que bloqueia o save quando `!isAllBalanced`. O save sempre prossegue; se houver desbalanço, mostramos apenas um toast de aviso (`toast.warning`) com o valor do gap por BU, mas a operação continua.

2. **Barra inferior (linhas 3128–3168)** — manter os badges visuais (Modelo Atual: -R$ 1.873.744 em vermelho), pois ajudam o usuário a enxergar o desbalanço, mas:
   - O botão "Salvar Todas" deixa de ficar travado visualmente (sempre verde / habilitado).
   - O `title` do botão muda para algo como: "Salvar (há BUs desbalanceados — será salvo mesmo assim)" quando `!isAllBalanced`.
   - O ícone passa a ser sempre `CheckCircle2` (verde) se balanceado, ou `AlertTriangle` (âmbar) se não — mas clicável nos dois casos.

3. Sem mudanças em banco, hooks ou edge functions. A regra de equilíbrio anual deixa de ser uma trava do produto e vira responsabilidade do usuário.

## Consequências esperadas

- Você consegue salvar Jun=550k, Jul=600k, Ago=700k, Set=700k, Out=700k, Nov=700k, Dez=600k mesmo com o gap de ~R$ 1,87M no Modelo Atual.
- A "Meta Anual" do Modelo Atual continua a mesma no banco (`monetary_metas`); apenas a soma de "A Vender" vai ficar abaixo dela. Os cards de pacing/projeção que comparam realizado vs meta anual continuam funcionando normalmente.
- Qualquer cálculo que dependa da soma de "A Vender" para reconstruir a meta passará a refletir o novo total (menor). Se quiser, em iteração futura podemos adicionar um botão "Ajustar Meta Anual ao A Vender" para reconciliar.

## Detalhes técnicos

- A constante `isAllBalanced` continua existindo (usada para colorir badges e ícone), só perde o poder de bloquear o `handleSaveAll`.
- Toast de aviso: para cada BU com `Math.abs(diff) >= 100`, listar `BU: ±R$ X` num único `toast.warning` antes de prosseguir com `bulkUpdateMetas`.
- Nenhuma alteração em `useMonetaryMetas`, `usePlanGrowthData`, `manage-redistribution` ou tabelas.
