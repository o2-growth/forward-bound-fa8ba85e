
## Objetivo

Refazer o `G4ConsolidatedDashboard` para ter o mesmo padrão visual do Indicadores Comercial: KPIs no topo, gráficos comparativos, e depois tabela detalhada por live/evento com drill-down. Hoje é só uma tabela crua — vamos evoluir para uma visão macro→micro de verdade.

## Estrutura nova (top → bottom)

**1. Header com filtros**
- Toggle: `Todos` | `Lives` | `Eventos`
- Range de datas (dropdown: Últimos 30d / 90d / Todo período)

**2. Faixa de KPIs consolidados (7 cards)**
Cards no mesmo estilo do Indicadores Comercial (título pequeno + número grande + delta opcional):
- Total Leads
- MQLs (com % conversão sobre Leads)
- Em Contato
- Quentes (destaque laranja)
- Fechados (destaque verde + % close rate)
- TCV total
- Ticket médio

**3. Grid de gráficos (2 colunas)**
Usando `recharts` (já no projeto):
- **Funil consolidado**: FunnelChart com Leads → MQL → Em contato → Quente → Ganho
- **Barras por live/evento**: BarChart empilhado (Leads / MQL / Ganho) ordenado por data
- **Pizza de temperatura**: Quente / Morno / Frio / Sem tag consolidado
- **Barras de motivo de perda**: top 6 motivos horizontais

**4. Ranking de eventos (mini-tabela compacta)**
Top 5 lives/eventos por Fechados e por TCV, lado a lado — visão rápida do que performou.

**5. Tabela detalhada (visão micro atual)**
Mantém a tabela expansível atual, mas:
- Header sticky
- Linha destacada quando `fechados > 0`
- Coluna extra: **Conv%** (Fechados / Leads)
- Drill-down expandido igual está hoje (fases / temperatura / perdidos / vendas)

## Detalhes técnicos

- Componente único `G4ConsolidatedDashboard.tsx` reescrito, mantendo `buildGroups`, `ExpandedRow`, `LeadsTable`, `MoneyCard`.
- Novos sub-componentes internos: `KpiStrip`, `ConsolidatedFunnel`, `EventsBarChart`, `TemperaturePie`, `LostReasonsBar`, `TopRanking`.
- Filtro Live/Evento por regex no nome (`live` vs resto = evento).
- Cores via tokens semânticos (`--primary`, `--destructive`, `--chart-*`) — sem hex hardcoded.
- Reutiliza `fmt`, `fmtInt` de `ceoShared`.
- Sem mudança em edge function nem hook — todos os dados já vêm de `useG4RealMetrics`.

## Arquivos afetados

- `src/components/planning/g4/G4ConsolidatedDashboard.tsx` — reescrito
- (nada mais)
