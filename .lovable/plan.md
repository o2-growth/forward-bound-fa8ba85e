## Objetivo

Adicionar, no topo da seção de **Churn** (dentro da aba **Operação**), um botão clicável "Como funciona" que abre um modal explicando, em linguagem clara, como a plataforma identifica/conta um churn, de onde puxa os dados e como cada KPI é calculado.

## Onde

`src/components/planning/nps/ChurnDossierSection.tsx` — adicionar o botão no cabeçalho do bloco "Churn no período" (perto do título, linha ~377).

## O que será adicionado

Um novo componente `ChurnExplainerDialog` (arquivo novo em `src/components/planning/cs/ChurnExplainerDialog.tsx`) que renderiza um `Dialog` (shadcn) acionado por um `Button variant="ghost" size="sm"` com ícone `HelpCircle` + texto "Como funciona".

### Conteúdo do modal (seções)

1. **O que é considerado churn na plataforma**
   - Card na Central de Projetos que entrou na fase **"Churn"** (Pipefy · pipe 305887184).
   - Cards de teste excluídos via `isTestCard` (lista fixa de IDs).
   - Comparações de fase normalizadas (trim, lowercase, sem acento).

2. **Data de reconhecimento (quando o churn é contado)**
   - Prioriza **Data oficial de encerramento** (Central de Projetos).
   - Fallback: **Data de assinatura do contrato** / `mesChurn` (aprox. dia 15).
   - O churn aparece no período cujo intervalo contém essa data.

3. **De onde vêm os dados**
   - **Pipefy · Central de Projetos** (fase Churn, MRR CFOaaS + OXY, datas, motivo).
   - **Banco Lovable** · overrides oficiais (8 ajustes manuais em Abr/26 para corrigir atribuição de CFO).
   - **Pipe de Tratativas** para Taxa de Salvamento.
   - Sincronização via Edge Function `sync-pipefy-funnel` (tempo real / cache curto).

4. **Como cada KPI é calculado**
   - **Revenue Churn (R$)** = soma do MRR (CFOaaS + OXY) dos churns do período.
   - **Revenue Churn (%)** = MRR perdido / (MRR ativo + MRR perdido) × 100.
   - **Logo Churn (Qtd.)** = nº de cards em Churn no período.
   - **Logo Churn (%)** = churns / (ativos + churns) × 100.
   - **LT Médio** = média, em meses, entre `Data de assinatura do contrato` e data de encerramento.
   - **Taxa de Salvamento** = tratativas salvas / (tratativas salvas + churns) × 100.
   - **MRR ativo** = soma de MRR de cards em Onboarding + Em Operação Recorrente.

5. **Filtros que afetam a contagem**
   - Período global (date range), CFO, Produto, Tipo de churn (operacional/comercial — comercial = motivo "Desistência"), e exclusões de motivo.

6. **Notas e cuidados**
   - Mesmo cliente conta uma vez por período (dedup por card).
   - Educação não entra no MRR (segue regra global).
   - Link direto ao pipe para auditoria.

### Estilo

- Usa `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `Badge` e `Separator` do design system (tokens semânticos: `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted/30`). Sem cores hardcoded.
- Ícones: `HelpCircle`, `Database`, `Calendar`, `Calculator`, `Filter` (lucide-react).
- Link "Abrir Central de Projetos no Pipefy" no rodapé.

## Fora de escopo

- Não altera nenhuma lógica de cálculo ou hook (`useOperationsData`, filtros, agregações). Apenas UI explicativa.
- Não mexe no `DataSourceInfo` existente (continua nos cards individuais).
