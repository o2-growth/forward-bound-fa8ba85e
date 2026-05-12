Vou ajustar o Dossiê de Churn para parar de manter esses 4 clientes em abril quando a data oficial indicar outro mês.

Plano:
1. Corrigir o vínculo com Tratativas
   - Hoje o mapa `título → tratativa` pega apenas registros em que `Fase === Fase Atual` e pode escolher uma tratativa que não contém a data oficial correta.
   - Vou passar a escolher, por cliente, a tratativa com a melhor data oficial de encerramento disponível, priorizando `Finalização do contrato (último dia trabalhado)`.

2. Usar o campo oficial com mais variações de nome
   - Expandir a leitura para contemplar nomes com/sem acento e a forma do relatório oficial: `Finalização do contrato (último dia trabalhado)`.
   - A hierarquia continuará sendo: data oficial da tratativa → backups do card → saída/entrada apenas como último recurso.

3. Filtrar pelo mesmo mês exibido
   - O filtro global da tela deve usar `dataEncerramento` calculada pelo hook, sem cair em uma data de fase antiga.
   - Vou garantir parse local de `YYYY-MM-DD`, evitando diferenças de fuso e garantindo que o mês filtrado seja o mesmo mostrado na coluna “Mês do Churn”.

Resultado esperado:
- Abril/2026 deixa de mostrar Rampanelli Redemac se a data oficial dele for março.
- A lista de abril passa a se alinhar ao relatório oficial do CRM.
- Os clientes realmente oficiais de abril continuam aparecendo quando estiverem na base carregada pelo app.