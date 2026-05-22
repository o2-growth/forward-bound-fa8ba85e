## Mudanças em `VisaoGeralCS.tsx` (Distribuição de Clientes Ativos)

1. **Renomear "SaaS" para "MRR"** no card de tipo de produto (label, header e textos auxiliares).

2. **Tornar os cards "MRR" e "Pontual" clicáveis** — ao clicar, abre um Dialog com a lista de clientes daquele tipo (mesmo padrão visual dos Dialogs já existentes para KPIs).

### Detalhes técnicos

- Adicionar novo estado `tipoDialog: 'mrr' | 'pontual' | null` (separado do `KpiDialogType` para não colidir com o KPI "MRR Base" já existente).
- Adicionar classes `cursor-pointer hover:bg-*/10 transition-colors` nos dois cards e `onClick` para abrir o dialog correspondente.
- Criar um único `<Dialog>` que filtra `activeClientes` pelo critério atual:
  - MRR: `c.mrr > 0`
  - Pontual: `c.mrr === 0 && c.pontual > 0`
- Listar cada cliente em uma `<Table>` com colunas: Cliente, CFO, MRR, Pontual, Fase Atual — ordenado por MRR desc.
- Atualizar o tooltip do header para refletir "MRR" no lugar de "SaaS".

### Fora do escopo
- Nenhuma mudança em lógica de classificação, cálculos de MRR ou outros componentes.
- Sem alteração no KPI "MRR Base" da linha superior.