## Contexto

Hoje, no Funil de Expansão (`useExpansaoMetas`, `useExpansaoAnalytics`) e no Modelo Atual (`useModeloAtualMetas`, `useModeloAtualAnalytics`), a `Data de assinatura do contrato` só substitui a data de movimentação de "Contrato assinado / Ganho" quando há **inversão dia/mês** (via `fixPossibleDateInversion`). Em todos os outros casos, vale a data da movimentação no Pipefy.

Você quer que, **apenas para os 8 cards listados**, a data efetiva da venda seja **sempre** a `Data de assinatura do contrato` (ignorando a movimentação), preservando o comportamento atual para todos os demais.

## Cards alvo (match por título — case/acento-insensitive, contém)

**Funil de Expansão:**
- JEAN MORBIS
- MONICA SPINELLI
- RICARDO REIS
- ALEXANDRE CORREA
- ELIZETH

**Modelo Atual:**
- EDIOURO
- COTRIM ENTERPRISES
- FUJITEC

## Mudanças propostas

### 1. Novo helper compartilhado em `src/hooks/dateUtils.ts`

```ts
const FORCE_ASSINATURA_TITLES = {
  expansao: ['JEAN MORBIS','MONICA SPINELLI','RICARDO REIS','ALEXANDRE CORREA','ELIZETH'],
  modelo_atual: ['EDIOURO','COTRIM ENTERPRISES','FUJITEC'],
};

export function shouldForceAssinaturaDate(
  titulo: string,
  bu: 'expansao' | 'modelo_atual'
): boolean {
  const norm = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const t = norm(titulo);
  return FORCE_ASSINATURA_TITLES[bu].some(name => t.includes(norm(name)));
}
```

(Usa as regras de normalização padrão do projeto.)

### 2. Aplicar nos hooks de Expansão

Em `useExpansaoMetas.ts` (linhas ~93-97) e `useExpansaoAnalytics.ts` (linhas ~131-133), na fase `'Contrato assinado'`:

- Se `shouldForceAssinaturaDate(titulo, 'expansao')` e existe `dataAssinatura` → `dataEntrada = dataAssinatura` (override total).
- Caso contrário, manter o comportamento atual com `fixPossibleDateInversion`.

### 3. Aplicar nos hooks de Modelo Atual

Em `useModeloAtualMetas.ts` (linhas ~278-279, 341-342) e `useModeloAtualAnalytics.ts` (linhas ~130-133, 385-390, 438-440), nos pontos onde se decide a `effectiveDate` para `venda`:

- Se `shouldForceAssinaturaDate(titulo, 'modelo_atual')` e existe `dataAssinatura` → usar `dataAssinatura` como data efetiva, sem passar pela checagem de inversão.
- Caso contrário, manter o comportamento atual.

### 4. Não mexer em

- `useOxyHackerMetas.ts` (não está na lista).
- `sync-pipefy-funnel/index.ts` Edge Function — ela já usa `Data de assinatura` como `saleDate` para a tabela `funnel_realized`, então não precisa de ajuste.
- Nenhuma migração de DB.

## Impacto esperado

- Os 8 cards passarão a contar a venda no mês da assinatura do contrato em todos os gráficos/KPIs/funil de Expansão e Modelo Atual (Indicadores, Drill-downs, Sales Goals, Plan Growth, etc.).
- Os demais cards continuam exatamente com o comportamento atual.
- Lista de exceções fica centralizada em `dateUtils.ts`, fácil de editar no futuro.

## Risco / atenção

- Match por título é sensível a renomes futuros no Pipefy. Se algum card for renomeado, a regra deixa de aplicar — basta atualizar a lista.
- Se houver mais de um card com título contendo o mesmo nome (homônimos), todos serão afetados. Hoje os nomes parecem únicos o suficiente.
