## Pontos a resolver

1. **Redundância "Tratativas Salvas" / "Taxa de Salvamento"** no `ChurnDossierSection` vs "Tratativas resolvidas com sucesso" no `OperacaoKpisStrip`, com **valores diferentes** (4 vs 2) — o dossiê usa `tratativasResolvidasCount` cru (todo o histórico) e o strip usa filtrado por período.
2. **"Tempo levantar a mão → churn" mostra 61 em andamento** porque hoje o universo é "todas as tratativas com 1ª entrada", sem recorte temporal. Conforme decidido antes, o universo deve ser **só tratativas iniciadas no período do filtro**.
3. **Valor isentado dos 3 churns Atendimento O2 = R$ 0** (Amora Distribuidora, Grupo Imagem, Fiagro). Hoje o `valorIsentadoByTitulo` só lê linhas de tratativa com `Fase === Fase Atual`, e cobre apenas 4 variações exatas de nome do campo. É provável que a linha de finalização tenha sido descartada.

## Mudanças

### 1) `src/hooks/useJornadaData.ts`

**a. Captura tolerante do valor isentado** (resolve ponto 3):
- Mover a leitura de `valorIsentado` para fora do `continue` que descarta linhas com `Fase !== Fase Atual` — capturamos em **qualquer** linha de movimento da tratativa.
- Função tolerante de match de campo:
  ```ts
  const normKey = (k: string) => k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const readValorIsentado = (row) => {
    for (const k of Object.keys(row)) {
      const nk = normKey(k);
      if (nk.startsWith('valorisentado')) return readNum(row[k]) / 100;
    }
    return 0;
  };
  ```
- Acumular o **máximo** por título (não soma) — evita duplicar quando o histórico tem várias movimentações.
- Normalizar título com NFD (`normTitulo`) ao indexar e ao consultar do lado dos churns.
- Diagnóstico temporário: `console.log('[isentado/diag]', { Amora, GrupoImagem, Fiagro, totalComValor })`.

**b. Adicionar `data` em `tempoTratativaChurn`** (suporte ao recorte do ponto 2):
- Em cada item, incluir `data: tratativaDate` (a 1ª entrada na tratativa). Atualizar a tipagem em `OperacaoKpisStrip`.

### 2) `src/components/planning/cs/OperacaoKpisStrip.tsx`

- Adicionar `data?: Date | null` no tipo de `tempoTratativaChurn`.
- No card "Tempo levantar a mão", filtrar `tempoTratativaChurn` por `inRange(item.data)` (1ª entrada da tratativa dentro do período). Recalcular mediana/média e contagens (churns / em andamento) **a partir desse subconjunto**.
- Atualizar tooltip: "Universo: tratativas iniciadas no período selecionado."

### 3) `src/components/planning/nps/ChurnDossierSection.tsx`

Resolve ponto 1, removendo a duplicidade:
- **Remover** o card "Tratativas Salvas" do dossiê (já existe no strip acima como "Tratativas resolvidas com sucesso").
- **Manter** o card "Taxa de Salvamento" (métrica única do dossiê), mas:
  - Receber `tratativasResolvidasCount` já **filtrado pelo período** — alterar `CustomerSuccessTab.tsx` para passar `resolvidasFiltered.length` em vez de `operacao.tratativasResolvidasCount`.
  - Ajustar grid de `grid-cols-3` para `grid-cols-2` na linha onde o card removido estava (ou recompor com Logo Churn% + Taxa de Salvamento).

### 4) `src/components/planning/CustomerSuccessTab.tsx`

- Calcular `resolvidasNoPeriodo` aplicando `inRange` (mesma regra do strip) e passar para o dossiê.
- Alternativa mais limpa: expor a contagem filtrada diretamente do `OperacaoKpisStrip` via callback **ou** mover o filtro para um util compartilhado. Vou usar um util inline (`filterByDateRange`) no `CustomerSuccessTab` para manter consistência.

## Resultado esperado

- "Tratativas Salvas" deixa de existir no dossiê; "Taxa de Salvamento" passa a usar a mesma contagem do strip (2 em Abr/26, batendo).
- "Tempo levantar a mão" mostra apenas tratativas que **começaram** entre 01/04 e 30/04 — os 61 em andamento caem para um número condizente (provavelmente <10).
- Os 3 churns Atendimento O2 passam a aparecer com seus valores reais de Pipefy no card "Valor isentado", validados via console.log diagnóstico.