## QA visual da aba Marketing

Rodar um smoke test end-to-end contra o preview em `localhost:8080` para validar que as 13 correções aplicadas se comportam corretamente na UI, cobrindo os principais eixos: filtro de data, filtro de BU, hero KPIs, tabela Indicadores 26, e as seções redesenhadas.

### Escopo do teste

1. **Autenticar** — restaurar sessão Supabase via `LOVABLE_BROWSER_SUPABASE_*` e navegar para `/` → aba Indicadores → sub-aba Marketing.
2. **Baseline (Consolidado, ano corrente)** — screenshot da aba inteira em viewport 1280×1800, seção por seção:
   - Hero (Investimento • CPMQL • CAC)
   - Indicadores 26
   - CPV / CAC Total
   - Performance por Canal
   - Performance de Campanhas — Criativos
   - Funil Comparativo por Fonte
   - Resultados Gerais (com deltas vs período anterior)
   - Online vs Offline
   - Curva de Conversão
   - Cohorts (Entrada / Assinatura)
3. **Teste do filtro de BU** — selecionar "Modelo Atual", capturar screenshot e confirmar que:
   - Números do CPV, Performance por Canal, Funil por Fonte, Resultados Gerais, Online/Offline e Cohorts caem (não ficam idênticos ao Consolidado).
   - Investimento total (Meta+Google) permanece igual (spend não é segmentável por BU).
4. **Teste do filtro de data** — mudar para "Mês atual" e confirmar que Indicadores 26 corta as colunas em vez de mostrar o ano todo.
5. **Console/Network** — coletar erros de console e requests que falharam (4xx/5xx) durante a navegação.
6. **Report** — resumir observações (números vistos por seção, comportamento dos filtros, erros) e anexar as capturas para revisão.

### Critérios de aprovação

- Sem erros vermelhos no console durante a navegação.
- Filtro de BU altera visivelmente todas as seções listadas.
- Filtro de data reduz as colunas de Indicadores 26.
- Nenhuma seção quebra com "undefined" / spinner infinito / NaN.

### Detalhes técnicos

- Script único em `/tmp/browser/mkt-qa/run.py` usando Playwright + Chromium headless.
- Screenshots em `/tmp/browser/mkt-qa/screenshots/`.
- Executado como comando shell dentro do sandbox (sem tocar em nenhum arquivo do projeto).
- Se algum critério falhar, retorno com o achado + evidência antes de propor correção.
