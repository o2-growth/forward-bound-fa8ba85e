## Continuar verificação — aba Indicadores › Comercial

Já cheguei na aba correta. Próximos passos do Playwright:

1. No filtro "Consolidado" (dropdown de BUs) desmarcar Modelo Atual, O2 TAX, Oxy Hacker — deixar só **Franquia**.
2. Aguardar recarregar, clicar no card radial **MQLs**.
3. Screenshot do drill-down "MQL - De Onde Vêm Nossos Melhores Leads?" — checar:
   - Coluna "Faixa Faturamento" com valores reais (não "-")
   - Gráfico "Por Faixa de Faturamento" com múltiplas barras (não só "Não informado")
4. Repetir para **Oxy Hacker**.
5. Relatar resultado. Sem edits nesta rodada.

Se algum passo falhar por seletor, ajusto com `sed -i` no script e re-rodo.