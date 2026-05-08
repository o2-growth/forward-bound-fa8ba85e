## Remover Carol como SDR

### Mudanças

**1. `src/hooks/useSdrMetas.ts`**
- Remover "Carol" de `SDRS` (linha 16).
- Remover "Carol" de `BU_SDRS` em `modelo_atual`, `oxy_hacker` e `franquia` (linhas 24, 26, 27).

**2. `src/components/planning/IndicatorsTab.tsx`**
- Remover "Carol" de `BU_SDRS` em `modelo_atual`, `oxy_hacker`, `franquia` (linhas 88, 90, 91).
- Remover entrada `{ value: 'Carol', label: 'Carol' }` de `sdrOptions` (linha 99).

**3. `src/components/planning/StructureTab.tsx`**
- Remover o objeto SDR da Carol (linhas 485-494) da equipe Modelo Atual.

**4. Banco de dados**
- Migration para deletar registros de `sdr_metas` onde `sdr = 'Carol'` (12 registros, todos com metas zeradas — sem perda de dados reais).

**5. Memória**
- Atualizar `mem://team-structure/sdr-bu-assignment` removendo Carol.

### Fora de escopo
- Não vou mexer em dados históricos do Pipefy (cards já criados pela Carol continuam aparecendo no histórico, o que é o comportamento correto).
