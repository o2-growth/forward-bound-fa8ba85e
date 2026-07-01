## Documento: Auditoria Marketing — P1, P2 e P3

Gerar um arquivo `.docx` para download em `/mnt/documents/auditoria-marketing-p1-p2-p3.docx` consolidando os 13 achados aplicados na aba Marketing, agrupados por prioridade.

### Estrutura do documento

**Capa / Cabeçalho**
- Título: "Auditoria da Aba Marketing — Correções P1, P2 e P3"
- Data de geração e escopo (dashboard O2 / aba Indicadores → Marketing)

**Seção 1 — P1 (Crítico)**
Para cada item: problema encontrado, correção aplicada, arquivo afetado, resultado esperado.
1. Denominador de vendas inconsistente → `salesInPeriod.length` unificado
2. Comparativo período anterior quebrado → hooks `prevRange` em `OverallResultsSection`
3. Fase "Ganho" excluída de LTV/MRR → incluída no cálculo e drill-down
4. GMV sem like-for-like → injeção da receita de Educação no baseline

**Seção 2 — P2 (Alto)**
5. CAC com denominadores divergentes → unificado em `PerformanceGauges`
6. Drill-down por estágio usando dados estáticos → agora usa `enrichedTotals`
7. CPV dividindo por vendas totais → estrito a mídia paga
8. Constantes de funil duplicadas → centralizadas em `SourceFunnelSection`

**Seção 3 — P3 (Médio)**
9. "Indicadores 26" ignorando filtro de data → cursor de colunas respeita `dateRange`
10. `selectedBU` só afetava tabela de campanhas → propagado via `marketingBuFilter` a todas as seções
11. Investimento de Eventos hardcoded (R$ 25k) → tabela `event_investments` + hook `useEventInvestments`
12. Online vs Offline sem cohort de entrada → validada lógica por `fonte/origem` do lead
13. LTV com fórmulas divergentes → centralizado em `marketingLtv.ts` (MRR × retenção)

**Seção 4 — QA visual**
Resumo do teste Playwright: sem erros de console/network, filtros de BU e data funcionais, apenas warning cosmético de `key` no `ConversionsByChannelChart`.

### Detalhes técnicos

- Gerado com `docx-js` (Node) seguindo o skill/docx: US Letter, Arial, headings customizados, tabelas com `WidthType.DXA`, bullets via `LevelFormat.BULLET`.
- Após gerar, validar com `validate_document.py` e converter para PDF+imagens só para QA visual interna (não entregar).
- Entregar via `<presentation-artifact>` apontando para `auditoria-marketing-p1-p2-p3.docx`.

Confirma que quer em `.docx` mesmo? Se preferir PDF ou Markdown eu ajusto antes de gerar.