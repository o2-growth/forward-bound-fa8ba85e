## Excluir "SDR AI" e "Administrativo - Almoxarifado" da aba Pessoas

### O quê
Remover essas pessoas/cargos de todos os indicadores da aba Pessoas (headcount, admissões, desligados, turnover, tempo de casa, distribuições, drill-downs).

### Como
Aplicar o filtro no ponto único de carregamento: `fetchPessoas` em `src/hooks/useHrData.ts`. Assim todos os helpers (`isAtivoRow`, `headcountByBu`, `tenureDistribution`, etc.) consomem a lista já saneada — sem precisar mexer em cada componente.

Regra de exclusão (case-insensitive, com normalização de acento/espaço):
- `Cargo` contém "sdr ai", **ou**
- `Cargo` contém "almoxarifado", **ou**
- `Time` contém "almoxarifado"

Cobre as variações "SDR AI", "Administrativo - Almoxarifado", "Administrativo – Almoxarifado", etc.

### Arquivos
- `src/hooks/useHrData.ts` — adicionar função `isExcludedRow(p)` e filtrar o retorno de `fetchPessoas` antes de devolver para o React Query.

### Fora de escopo
- Custo por BU (`usePersonnelCost*`) usa outra fonte (planilha) — não mexer agora. Se aparecerem nessas planilhas e o usuário quiser excluir lá também, faço num passo seguinte.
