## Plano

1. **Usar a mesma fonte do dossiê de churn na tabela de CFOs**
   - Passar `opsData.churnDossier` para `CfoView` a partir de `CustomerSuccessTab`.
   - Essa lista já contém os overrides oficiais, incluindo os 8 churns de Abr/2026.

2. **Recalcular “Churns” por CFO com base no filtro de data global**
   - Em `CfoView`, contar churns por CFO a partir de `dataEncerramento` do dossiê.
   - Aplicar o intervalo `csStartDate → csEndDate` já usado na página.
   - Respeitar filtros de CFO/produto que já chegam via dados filtrados.

3. **Manter fallback seguro**
   - Se o dossiê não estiver disponível, manter a lógica atual com `clientes` + `dataChurnOficial`.
   - Assim a tabela não quebra em carregamento parcial.

4. **Atualizar todos os pontos que mostram churns no CFO**
   - Linha “Churns” no comparativo P&L por CFO.
   - Coluna “Churns” na tabela inferior.
   - Badge de churns nos cards dos CFOs.

## Resultado esperado

Com o filtro `01/04/2026–30/04/2026`, a tabela deve deixar de mostrar todos os CFOs com `0` e passar a refletir os churns oficiais de abril distribuídos por CFO, igual ao dossiê de churn.