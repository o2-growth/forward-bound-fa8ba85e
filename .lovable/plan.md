## Objetivo

Tornar o card "Oportunidades quentes" do Pace Comercial clicável para abrir o `DetailSheet` com a lista completa de propostas quentes (mesmo padrão dos drill-downs de indicadores do dashboard).

## Mudanças

### 1) `CommercialPaceDashboard.tsx`

- Adicionar prop opcional `onHotOpportunitiesClick?: (items: DetailItem[]) => void`.
- No `<section className="cp-card span-5">` do card "Oportunidades quentes" (~L657):
  - Adicionar `role="button"`, `tabIndex={0}`, cursor pointer e `onClick` que chama `onHotOpportunitiesClick(hotActive)` (respeitando o filtro de closer selecionado).
  - Suportar Enter/Space no `onKeyDown`.
  - Título/subtítulo com dica visual "clique para ver detalhes".
- Também tornar cada linha por closer (`.hot-row`, L676) clicável — chama o mesmo handler filtrando `hotOpportunityItems` pelo `firstNameKey` do closer da linha.

### 2) `IndicatorsTab.tsx` — handler que abre o DetailSheet existente

Passar `onHotOpportunitiesClick={(items) => { ... }}` para `<CommercialPaceDashboard>` (~L3405) que:

- Seta `detailSheetTitle` = "Oportunidades quentes — Modelo Atual".
- Seta `detailSheetColumns` com: Empresa, Fase atual, Valor (MRR+Setup+Pontual), Closer, Data entrada — reusando `columnFormatters.currency`/`date`.
- Ordena por valor desc.
- `setDetailSheetFilterCriteria([])` (ou 1-2 chips explicando: "Temperatura = Quente", "Sem fase terminal", "Sem motivo de perda").
- `setDetailSheetOpen(true)`.

## Efeito

- Clique no card total abre lista de todos os quentes filtrados (por closer selecionado no Pace, se houver).
- Clique na linha de um closer específico abre a lista somente daquele closer.
- Nenhum impacto em cálculos — apenas UI/navegação.

## Arquivos

- `src/components/planning/indicators/CommercialPaceDashboard.tsx`
- `src/components/planning/IndicatorsTab.tsx`
