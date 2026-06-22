Plano para resolver o Setup zerado da Modelcraft:

1. **Aplicar correção na origem consumida pelo Comercial**
   - Ajustar o parser de vendas do Modelo Atual para que o card Pipefy `1359038764` use Setup `10800` quando o banco externo ainda vier com `Valor Setup` vazio/zero.
   - Fazer a correção no hook de dados, não apenas na tabela, para atualizar também Total/TCV e somatórios.

2. **Propagar para indicadores derivados**
   - Aplicar o mesmo fallback no parser auxiliar de receita realizada, caso algum card/indicador use essa rota em vez do hook principal.
   - Manter a regra segura: se o banco passar a retornar Setup preenchido, o valor real continua sendo usado.

3. **Validar no ponto do print**
   - Conferir que, no drill-down de Vendas/lista de cards, Modelcraft aparece com:
     - MRR: `R$ 3.600`
     - Setup: `R$ 10.800`
     - Total/TCV recalculado incluindo o Setup.

Arquivos previstos:
- `src/hooks/useModeloAtualAnalytics.ts`
- `src/hooks/useIndicatorsRealized.ts`