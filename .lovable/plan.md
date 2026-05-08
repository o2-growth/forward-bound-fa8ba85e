## Objetivo

Hoje a linha do **Pedrolo** na CfoView soma ao MRR o faturamento agregado dos 3 produtos OXY do DRE — mas a contagem de clientes e a lista de clientes do squad continuam vazias (ou só com quem tem `CFO Responsável = Pedrolo` no Pipefy assinado no mês passado).

A pedida: os **clientes do Pipefy que possuem os produtos OXY / OXY + Gênio / OXY + Gênio + Especialista** também devem aparecer dentro do squad Pedrolo (contagem, lista no drilldown, alertas, NPS médio etc.), independentemente do CFO Responsável que estiver lançado no card.

## Escopo

- **Fonte dos clientes**: Pipefy (mesmo dataset já carregado em `useJornadaData`), filtrando pelo campo `produto` / `produtos` (ou conexões `DB Produtos`) por nome normalizado: `oxy`, `oxy + genio`, `oxy + genio + especialista`.
- **Atribuição**: forçar `cfo = "Eduardo Milani Pedrolo"` para esses clientes nas estruturas usadas pela CfoView (sem alterar o card original no Pipefy).
- **Filtro temporal**: mantém a regra atual do Pedrolo (apenas clientes com **assinatura no mês calendário anterior**) para ficar coerente com o recorte do DRE.
- **Receita por cliente**: continua usando `valorSetup + valorOxy` do próprio card (regra atual do Pedrolo). O valor extra do DRE (3 produtos OXY agregados) **continua somado por cima** no `mrrTotal`, como já está hoje — esses dois somatórios coexistem (clientes Pipefy + agregado DRE).
- **Outros squads**: se o cliente já está atribuído a outro CFO no Pipefy, ele continua aparecendo lá também (não removemos do CFO original) — apenas duplicamos para Pedrolo. (Alternativa: mover. Adoto duplicar para não quebrar a contagem dos demais; podemos ajustar depois.)

## Mudanças técnicas

### `src/hooks/useJornadaData.ts`

1. **Constante** com os 3 nomes de produto OXY normalizados: `OXY_PRODUCT_NAMES = ['oxy', 'oxy + genio', 'oxy + genio + especialista']` + helper `normalize(s)`.
2. Após montar `allClientes` e antes de montar `carteiraClientes`, criar **clones virtuais** dos clientes cujo `produtos` (ou `produto`) contém algum dos OXY_PRODUCT_NAMES e cujo `cfo` ainda **não é** Pedrolo. Para cada um, criar uma cópia com:
   - `cfo = 'Eduardo Milani Pedrolo'`
   - `id = `${original.id}__pedrolo`` (evita colisão no `clienteMap`/drawers)
   - demais campos preservados
   Anexar ao `allClientes` (ou a um array separado consumido apenas por `cfoMap`/lista do squad). A consulta `Cliente360Drawer` continua usando o id original via prefixo.
3. A regra `isPedroloClient` + `isAssinaturaNoMesPassado` já existente passa a aplicar também nos clones, então a contagem respeita o recorte mensal.
4. Nenhuma mudança em alertas/pipeline globais; opcionalmente filtrar clones de `pipeline`/`alertas` para evitar duplicação visual em outras telas.

### `src/components/planning/jornada/CfoView.tsx`
- Atualizar tooltip da linha Pedrolo: deixar claro que **clientes** = cards Pipefy com produto OXY/Gênio/Especialista (assinatura no mês anterior); **MRR** = receita Setup+Oxy desses clientes + soma DRE dos 3 produtos OXY.

### Memória
- Atualizar `mem://logic/operations/mrr-total-definition` com a nova regra de atribuição de clientes do Pedrolo.

## Pontos a validar
- Confirmar que os nomes exatos dos produtos no Pipefy batem com as 3 strings (logar quantos clientes foram detectados em dev).
- Decidir se o clone deve aparecer no `ClientesView`/`AlertasView` global ou só no agregado do CFO (sugiro manter visível só no agregado — filtro por id com sufixo `__pedrolo`).
- Se nenhum produto match → comportamento atual preservado (só agregado DRE).
