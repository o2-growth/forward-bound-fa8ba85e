## Verificação proposta

Rodar Playwright headless contra `http://localhost:8080`, restaurar sessão, filtrar apenas Franquia + Julho/2026, abrir drill-down de MQL e conferir:

1. Coluna "Faixa Faturamento" mostra valores reais (ex: "Menos de 5 mil reais") em vez de "-"
2. Gráfico "Por Faixa de Faturamento" tem múltiplas barras (não só "Não informado")
3. Repetir para Oxy Hacker

Se aparecer o valor, o fix funcionou. Se ainda vier "-", investigo se `columnFormatters.revenueRange` ou o gráfico precisam de normalização adicional.

Sem edits de código nesta rodada — só screenshots + relato.