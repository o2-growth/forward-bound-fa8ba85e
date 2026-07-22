
## Mudança

Tornar todos os KPIs e métricas do `G4ConsolidatedDashboard` clicáveis, abrindo drill-down no mesmo padrão do Indicadores Comercial (`DetailSheet`), com tabela de leads, fase atual, empresa, contato, closer e link do Pipefy.

## Escopo dos clicáveis

**Faixa de KPIs (topo, consolidado global):**
- Leads → todos os leads
- MQLs ≥ R$ 200k → leads com faixa ≥ 200k
- Em contato → leads em fases de contato
- Quentes → temperatura Quente
- Fechados → fase Ganho (com colunas monetárias)
- TCV → mesma lista de Fechados
- Ticket médio → mesma lista de Fechados

**Tabela detalhada (por live/evento):**
- Cada célula numérica (Leads, MQLs, Em contato, Quentes, Fechados, Perdidos) vira clicável, abrindo drill-down filtrado pela live daquela linha
- Clicar na coluna "Live / Evento" continua expandindo inline (como hoje)

**Cards de motivo de perda no drill-down inline:**
- Cada motivo abre lista dos leads perdidos com aquele motivo

## Estrutura do drill-down

Reutilizar `DetailSheet` de `indicators/DetailSheet.tsx` com colunas:
- Empresa
- Contato (nome)
- Fase Atual
- Closer
- Faixa faturamento
- (para Fechados/TCV) MRR, Setup, Pontual, TCV
- (para Perdidos) Motivo
- Link Pipefy

Cada `DetailItem` mapeado de `G4RealLead` com `pipefyUrl` renderizado como ícone de link externo (já suportado pela coluna `name`/`company` da `DetailSheet` via formatter, ou adiciono coluna dedicada de ação).

## Arquivos

- `src/components/planning/g4/G4ConsolidatedDashboard.tsx`
  - State para controlar sheet (`open`, `title`, `items`, `columns`)
  - Helper `openDrill(title, leads, mode)` onde mode = `all | mql | contato | quente | ganho | perdido`
  - Envolver KPIs em `<button>` acessível
  - Envolver células numéricas da tabela em `<button>` (evitando conflito com o toggle de expandir a linha — clique na célula não propaga)
  - Manter drill-down inline atual (expandir linha) intacto

Sem mudanças em edge function, hook ou outros componentes.
