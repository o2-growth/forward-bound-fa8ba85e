## Objetivo
Hoje o funil Monetização classifica como **venda** (e contribui para o acelerômetro Comercial) qualquer card nas fases `Aprovado pelo Cliente`, `Jurídico`, `Faturamento` ou `Concluído`. O correto é considerar **ganho/venda somente quando o card chega em `Concluído`**.

## Mudança
Arquivo: `src/hooks/useMonetizacaoAnalytics.ts`

1. `VENDA_PHASES` passa a conter **apenas** `'Concluído'`.
2. As fases `Aprovado pelo Cliente`, `Jurídico` e `Faturamento` deixam de mapear para `venda` no `mapFaseToIndicator` — ficam como pipeline em aberto (não entram nem como Proposta nem como Venda no acelerômetro Comercial, pois já passaram da etapa de proposta).
3. A flag `ganho` por card já usa `faseAtual === 'Concluído'` — permanece igual e fica consistente.

## Impacto
- `MonetizacaoSection` (KPIs por fase/tipo): inalterado, continua mostrando a distribuição completa do pipe.
- `IndicatorsTab` (Comercial): quando filtro de origem inclui Monetização, o gauge de **Vendas** passa a contar somente cards em `Concluído`. Cards em Aprovado/Jurídico/Faturamento somem da contagem (não voltam para Proposta).
- `valorGanho` em `totals` continua = soma dos `Concluído` (já era).

## Pergunta de confirmação
Aprovado/Jurídico/Faturamento devem:
- (A) sumir totalmente do acelerômetro Comercial (proposta dessa plano), ou
- (B) voltar a contar como **Proposta enviada** até virarem Concluído?

Sigo com (A) salvo indicação contrária.
