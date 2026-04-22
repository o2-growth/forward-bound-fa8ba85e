

## Corrigir build error: campo `produtos` faltando em `useJornadaData.ts`

### Problema

O tipo `JornadaCliente` (em `src/components/planning/jornada/types.ts`) exige a propriedade `produtos: string[]`, mas o objeto construído em `src/hooks/useJornadaData.ts` (linha 309) não a inclui. Isso gera o erro TS2741 no build.

### Solução

No arquivo `src/hooks/useJornadaData.ts`, dentro do loop que monta o mapa `clienteMap`, adicionar a linha `produtos: produtoParts` logo após `produto` no objeto literal.

A variável `produtoParts` (array de strings) já existe no escopo (linha 245-247), então basta incluí-la.

### Alteração exata

Arquivo: `src/hooks/useJornadaData.ts`
Linhas: 309-342 (bloco do `clienteMap.set`)
Ação: Inserir `produtos: produtoParts,` imediatamente após `produto,`

