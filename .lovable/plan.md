## Plano de validação — commit 725803e

Executar 3 blocos de teste end-to-end no preview autenticado, mais checagens gerais. Reportar PASS/FAIL por item com screenshot + logs quando falhar.

### Preparação
1. `tsgo` no repo para confirmar 0 erros de tipo antes de subir Playwright.
2. Playwright headless em `http://localhost:8080` restaurando sessão Supabase gerenciada (LOVABLE_BROWSER_*). Viewport 1280x1800. Screenshots em `/tmp/browser/commit-725803e/screenshots/`.
3. Captura `console` e `network` (foco em `read-marketing-sheet`) durante toda a navegação.

### Teste 1 — Drill-down RR "Fase Atual"
- Navegar: Planejamento → Indicadores → Comercial.
- Aplicar filtro Closer = Daniel Trindade.
- Clicar acelerômetro "Reunião Realizada".
- Validar cabeçalho da tabela: `Produto | Empresa | Closer | Faixa Faturamento | Fase Atual | Tempo até Reunir | Data` (7 colunas, ordem exata).
- Coletar valores distintos da coluna "Fase Atual" — falhar se todas forem "Reunião Realizada".
- Repetir sem filtro de closer.
- Repetir para acelerômetro "Proposta enviada" e validar que "Fase Atual" mostra Ganho/Perdido/Follow Up (não sempre "Proposta enviada / Follow Up").

### Teste 2 — Marketing Indicadores
- Navegar: Planejamento → Marketing → Indicadores.
- 2.1 Ler tabela Enriched Channels: MQL de Meta Ads e Google Ads deve ser 0.
- 2.2 Coluna Eventos: capturar valor de investimento; comparar com `investimentoEventos` do JSON de `read-marketing-sheet`. Falhar se hardcoded 25.000 quando a planilha tem valor.
- 2.3 Conferir Hero CAC (topo) e Gauge CAC (grid). Confirmar sublabel "Somente mídia — OPEX não incluído" no gauge.
- 2.4 Interceptar resposta de `functions/v1/read-marketing-sheet` via `page.on("response")`; validar presença de `timeFerramentas`, `despesasTotais`, `investimentoEventos`.

### Teste 3 — Visão do CEO
- 3.1 Sub-abas Pessoal e Financeiro: setar DateRange 15/11/2025 → 15/01/2026 e conferir "Receita / pessoa" e "Receita do período" > 0.
- 3.2 Sub-aba DRE: confirmar linhas Oxy Hacker e Franquia com valores não-zero; comparar totais vs. cards de faturamento em outras abas.
- 3.3 Sub-aba Financeiro: confirmar card renomeado para "Churn Rate", valor pequeno (ex. 3.5%), sublabel "Histórico total — …" presente.

### Checagens gerais
- `tsgo` = 0 erros.
- Console = 0 exceções vermelhas durante a navegação (filtrar `Failed to fetch` do lovable.js overlay, que é ruído de dev).
- Qualquer modal em branco / loading infinito → screenshot + trace de network + arquivo/componente suspeito.

### Entrega
Resposta consolidada com tabela PASS/FAIL/warning por item, prints anexados nos casos com divergência e recomendação final (go/no-go para push).

### Nota
Este plano é somente de teste — nenhum arquivo do projeto será modificado. Se algum item falhar, retorno com diagnóstico e proposta de correção separada antes de qualquer edit.