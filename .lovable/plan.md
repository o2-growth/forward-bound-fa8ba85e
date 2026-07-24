## Problema

Cards com títulos `testenormal1`, `testejv`, `testeg41`, `testeg4` continuam aparecendo nos indicadores porque os padrões de detecção de título em `src/hooks/useModeloAtualMetas.ts` (`TEST_TITLE_PATTERNS`) exigem separadores de palavra:

- `\bteste?s?\b` só casa "teste"/"test" isolado (word boundary). "testeg4", "testejv", "testenormal1" grudam letras depois de "teste" e escapam.
- `[_.-]teste?s?[_.-]` exige delimitador antes/depois.
- Não há padrão para "teste" seguido diretamente de letras/dígitos.

Além disso, o mesmo dashboard do G4 (`src/components/planning/g4/G4ConsolidatedDashboard.tsx`) tem sua própria função `isTestG4Lead` que precisa cobrir o mesmo caso — hoje só filtra por email/domínio, não por título.

## Correção

1. **`src/hooks/useModeloAtualMetas.ts`** — adicionar em `TEST_TITLE_PATTERNS`:
   - `/^teste?s?[a-z0-9]/i` — pega "testeg4", "testejv", "testenormal1", "test123", etc. (começa com test/teste seguido de qualquer letra/dígito).
   - Isso complementa (não substitui) os padrões existentes.

2. **`src/components/planning/g4/G4ConsolidatedDashboard.tsx`** — estender `isTestG4Lead` para também rejeitar leads cujo `nome`/`empresa` casam com `isJunkCard`/`isTestByTitle` (importar de `useModeloAtualMetas`), garantindo consistência entre o dash comercial e o dash G4.

## Validação

- Rodar mentalmente os 4 títulos citados contra o novo regex: todos passam.
- Verificar que "testes automatizados" (palavra legítima) continua sendo pego pelo `\bteste?s?\b` já existente — sem regressão.
- Confirmar no preview que os 4 cards somem de Indicadores (MQL/Lead/Perdido) e do dash G4.

## Escopo

Somente as duas alterações acima. Nenhuma outra mudança de lógica.