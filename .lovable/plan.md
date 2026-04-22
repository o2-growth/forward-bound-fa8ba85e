

## Mover "Contratos por Faixa de Faturamento" para o drill-down de Vendas

### O que muda

**Remover** o card "Contratos por Faixa de Faturamento" da tela principal de Indicadores (logo abaixo dos gauges monetários).

**Adicionar** o mesmo widget dentro do modal de drill-down que abre ao clicar no acelerômetro **Vendas**, posicionado abaixo da seção "Composição do Faturamento" / charts (ainda dentro do bloco "Análise Visual"), antes da tabela de registros.

### Arquivos afetados

1. **`src/components/planning/indicators/DetailSheet.tsx`**
   - Adicionar prop opcional `extraContent?: React.ReactNode` na interface `DetailSheetProps`.
   - Renderizar `extraContent` dentro do `CollapsibleContent` de "Análise Visual", logo após `<DrillDownCharts />`.
   - Resetar nada extra no close (é nó controlado pelo pai).

2. **`src/components/planning/IndicatorsTab.tsx`**
   - Criar um novo estado `detailSheetExtraContent` (`React.ReactNode | null`) ao lado dos demais estados do DetailSheet.
   - Extrair a lógica atual do bloco "Contratos por Faixa de Faturamento" (linhas 2631–2723) numa função/JSX reutilizável `renderTierBreakdown(vendaItems)` que recebe os items e retorna o `<Card>` com a grid de tiers.
   - **Remover** o bloco JSX entre as linhas 2631–2723 da renderização principal.
   - No `case 'venda':` do `handleRadialClick` (próximo da linha 1829), antes de `setDetailSheetOpen(true)`, chamar `setDetailSheetExtraContent(renderTierBreakdown(items))`.
   - Em todos os outros `case`s e no `default`, chamar `setDetailSheetExtraContent(null)` para garantir limpeza entre cliques.
   - Passar `extraContent={detailSheetExtraContent}` no JSX `<DetailSheet ... />`.

### Comportamento final

- Tela principal de Indicadores: gauges monetários → (tier breakdown removido) → Loss Analysis → Revenue Pace.
- Clicar no gauge "Vendas" abre o modal "Vendas - Análise de Valor (TCV)" com:
  1. KPIs (Contratos, Setup, MRR, Pontual, TCV)
  2. Charts (Composição, Conversão por Tier, TCV por Closer/SDR)
  3. **Novo:** Card "Contratos por Faixa de Faturamento" (mesma aparência atual)
  4. Tabela detalhada de contratos

Sem mudança de schema, sem mudança de hooks, sem nova chamada à API — apenas reposicionamento.

