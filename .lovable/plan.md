## Objetivo
Adicionar uma nova sub-aba **"Typeform vs IA"** dentro do bloco "Comercial" (ao lado de Funil & Metas e Typeform), exibindo um comparativo **estático** dos dois canais de aquisição com base nos números fornecidos pelo usuário. Sem opiniões — só números, badges e diferenças calculadas.

## Estrutura da tela

### 1. Header
- Título: "Typeform vs Jéssica IA"
- Subtítulo: "Comparativo de canais de aquisição — janela de teste recente"
- Badge da janela: "Período: últimos 60 dias"

### 2. KPIs de destaque (4 cards, grid 2x2 / lg:grid-cols-4)
Usar `KpiBig` já existente para manter consistência:
- **Agendamentos**: Typeform `54` vs IA `28` → delta `+92,9%` a favor do Typeform
- **Conv. Lead → Agendamento**: Typeform `29,2%` vs IA `15,2%` → delta `+14,0 p.p.`
- **Engajamento**: Typeform `76,2%` vs IA `37,5%` → delta `+38,7 p.p.`
- **Conv. MQL → Agendamento**: Typeform `61,7%` vs IA `n/d`

### 3. Tabela comparativa completa (card)
Reproduz a tabela do screenshot. Colunas: Métrica | Jéssica IA (cold WhatsApp) | Typeform O2 TAX (inbound qualificado) | Vencedor (badge).
Linhas:
| Métrica | IA | Typeform |
|---|---|---|
| Leads tocados / únicos | 184 | 185 |
| Engajamento (resp/compl) | 69 (37,5%) | 141 (76,2%) |
| Qualificados (MQL ≥200k) | n/d (IA fala c/ todos) | 60 (32,4%) |
| Agendamentos | 28 | 54 |
| Conv. Lead → Agendamento | 15,2% | 29,2% |
| Conv. MQL → Agendamento | n/d | 61,7% |
| Velocidade mediana resposta | <segundos (auto) | 2,8 min |
| % resposta sub-10min | ~100% (auto) | 98,1% |
| Cobertura | 24/7 IA, sem humano | 7 SDRs humanos |
| Show-rate | 47,9% (60d) | n/d no painel |
| Vendas fechadas (60d) | 3 (R$ 72k) | n/d no painel |

Coluna "Vencedor" mostra badge `Typeform`, `IA` ou `—` conforme o número maior; quando IA tem vantagem natural (velocidade, cobertura 24/7) marcar como IA; quando Typeform não tem dado, deixar "—".

### 4. Vendas fechadas pela IA (tabela detalhada)
Card separado com a tabela das 3 vendas que o usuário forneceu:
Colunas: Empresa | Setor | Faturamento | Setup | Produto | SDR + Closer | IA agendou | Fechou.
Linhas:
- Imperador Burger | Comércio | 1-5M | R$ 32k | Assessoria+Gênio+Oxy | Érica + Thiago Zanoni | 17/05 | 26/05
- Firme Empreendimentos | Indústria | 350-500k | R$ 30k | CaaS Corp+Gênio+Oxy | Carlos + Thiago Zanoni | 20/05 | 25/05
- MARCIO ANDRADE | Serviço | 500k-1M | R$ 10k | Gênio+Oxy | Daniel Trindade + Amanda Serafim | 05/04 | 30/04

Footer do card com o total: **3 vendas · R$ 72k em Setup**.

### 5. Nota de rodapé pequena
"Dados consolidados em 01/06/2026 — Typeform: painel O2 TAX (Supabase). Jéssica IA: relatório operacional manual."

## Arquivos
- **Novo**: `src/components/planning/typeform/TypeformVsIATab.tsx` — componente estático com KPIs, tabelas e badges.
- **Editar**: `src/components/planning/IndicatorsWrapper.tsx` — mudar o sub-grid `grid-cols-2` para `grid-cols-3`, adicionar `TabsTrigger value="vs-ia"` e `TabsContent` correspondente.

## Fora de escopo
- Sem consulta de dados em tempo real — todos os números do screenshot/mensagem ficam hard-coded no componente (constantes no topo do arquivo) para fácil edição futura.
- Nenhuma mudança na aba Typeform existente.
- Sem migrations, edge functions ou alteração de schema.
