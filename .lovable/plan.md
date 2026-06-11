
# Plano — Reescrever Pace Comercial fiel ao HTML

## Problema
A versão atual de `CommercialPaceDashboard.tsx` reinterpretou o layout (shadcn `Card`/`Progress`/`Badge`, gradientes próprios, ordem diferente). O pedido é o contrário: **manter o HTML como está**, alterando **apenas as cores** para usarem os tokens do design system do projeto (HSL semânticos via `index.css` / Tailwind), preservando estrutura, hierarquia, tipografia (Space Grotesk para números, Inter para textos), espaçamento, comportamento e microinterações.

## O que mudar

### 1. Reescrever `CommercialPaceDashboard.tsx` espelhando o HTML
Recriar **a mesma estrutura DOM e classes** do `dashboard-closers.html`, em JSX:

- **Header** — `title-block` (h1 "Pace Comercial" + sub com período dinâmico) + `month-pace` (dia atual / dias do período + barra + percentual).
- **`closer-filter`** — chips horizontais "Todos os closers" + um chip por closer ativo (avatar circular com iniciais, cor por closer). Reflete o filtro `selectedClosers` ou exibe todos quando vazio. Clicar alterna o closer focado **dentro do dashboard** (estado local), sem alterar o filtro global dos indicadores.
- **Grid de 12 colunas** com 5 cards nas spans originais:
  1. **`span-7` Faturamento** — `rev-value`, `rev-meta` (meta + % atingido), `pace-badge` (ahead/behind), `rev-track` com `rev-bar` + `rev-fill` em gradiente + `pace-marker` posicionado no % de dias decorridos, escala min/max, `rev-foot` com 3 itens (Pace esperado hoje, Projeção fim do mês, Falta para a meta).
  2. **`span-5` Oportunidades quentes** — `hot-value`, `hot-badge` (% do pipeline), `hot-bar`, `hot-scale`, `hot-rows` (uma linha por closer com `h-name`, `h-bar`, `h-val`, `h-pct`), `hot-foot` "Realizado + quentes".
  3. **`span-5` Conversão do funil** — `funnel-v` com 4 `f-stage` (RM, RR, Prop, Venda) com largura proporcional ao volume e cor por métrica, intercalados por 3 `f-conn` mostrando `f-shape` (clip-path em formato de funil), taxa real `/ meta X%`, `att-bar` e `att-label`. Rodapé `funnel-overall` "Conversão geral RM → Venda".
  4. **`span-7` Ranking** — `rank-list` com `rank-row` (posição, avatar com iniciais, nome, `rank-bar` proporcional, faturamento, vendas + RM→V, pill `rank-pace ahead/behind`).
  5. **`span-12` Evolução diária do funil** — `chart-head` com `metric-toggles` (chip por métrica com swatch), `pace-toggle` (dashed), `mode-toggle` (Acumulado/Diário). Gráfico de linhas com Recharts substituindo Chart.js: uma `Line` por métrica ativa + uma `Line` tracejada da meta diária quando `paceOn`.
- **Footnote** abaixo do grid, igual ao HTML.

### 2. Tokens de cor — única substituição visual
Mapear as variáveis do HTML para tokens semânticos do projeto (sem cores literais nos componentes):

| HTML | Substituto |
|---|---|
| `--ink-0/--ink-1` (fundos) | `bg-background` |
| `--lane-1` (card) | `bg-card` |
| `--lane-2/--lane-3` (faixas internas, hover) | `bg-muted`, `bg-muted/60` |
| `--line/--line-soft/--line-strong` | `border-border`, `border-border/60` |
| `--chalk-1..4` (texto) | `text-foreground`, `text-muted-foreground`, `text-muted-foreground/70` |
| `--pace` (teal) | `hsl(var(--primary))` |
| `--ok` (verde) | `hsl(var(--success))` (já existe) |
| `--behind` (rosa) | `hsl(var(--destructive))` |
| `--warn` (amarelo) e `--hot` (laranja) | `hsl(var(--warning))` e variação com opacidade |

As cores **por closer** e **por métrica** (RM verde, RR amarelo, Prop roxo, Venda rosa) viram um mapa local usando `hsl(var(--chart-1..5))` para manter consistência com os demais gráficos do projeto. Nenhuma cor hex hardcoded em JSX.

Fontes:
- Garantir que `Space Grotesk` e `Inter` (já usadas em outros gráficos) sejam aplicadas via classes utilitárias do Tailwind (`font-display` / `font-sans`) — não importar via `<link>` no componente.

### 3. Comportamento idêntico
- Estado local: `selectedCloserLocal` ('all' ou id), `mode` ('cum' | 'daily'), `paceOn`, `metricOn { rm, rr, prop, venda }`.
- Funções utilitárias portadas: `sum`, `cum`, `seriesFor`, `totalsFor`, `countGoalsFor`, `attColor`.
- Tooltips `data-tipkey` (Propostas, Vendas, Pace) — implementadas com `<Tooltip>` do shadcn (radix) usando o mesmo conteúdo e mesmas variações de cor.

### 4. Fontes de dados (sem mudar regras de negócio)
Continuar recebendo as props já plumbadas em `IndicatorsTab`:
- `itemsByIndicator` (rm/rr/proposta/venda)
- `hotOpportunityItems`
- `revenueMeta`, `funnelMetas`
- período + filtros para o header
- `useCloserAbsoluteMetas` para metas individuais no ranking

Para campos do HTML que não existem hoje (`propPipe` por closer, `hotCount`), reutilizar `hotOpportunityItems` (já trazidos pelos hooks de analytics) — agrupando por closer. Quando não houver dado, mostrar o mesmo estado vazio definido no HTML (`—`).

### 5. Validação
- Comparar lado a lado com o HTML original: alinhamento dos 5 cards, espessura das barras, marcador "pace hoje", clip-path do funil, pills de pace, chips de filtro, toggles do gráfico.
- Conferir tipografia (números em Space Grotesk tabular), cores em modo claro/escuro do app, responsividade ≤1100px (cards passam a `span-12`).
- Conferir que nenhuma cor hex aparece em JSX/CSS do componente — apenas tokens.

## Detalhes técnicos
- Arquivo único `src/components/planning/indicators/CommercialPaceDashboard.tsx` reescrito (substitui o atual).
- CSS escopado: usar Tailwind para tudo possível e um pequeno bloco `<style>` colocalizado **somente** para o clip-path do funil e o gradiente da `rev-fill`/`hot-bar` (usando `hsl(var(--primary))` etc).
- Gráfico de linhas com `recharts` (`LineChart` + `Line` com `strokeDasharray` para o pace). Manter aspect ratio do `chart-wrap` (altura 320px).
- Sem novas dependências, sem migração, sem mudanças em `IndicatorsTab` (props já compatíveis; ajustar só se faltar algo).
