Plano para corrigir o MQL mostrando 200:

1. Ajustar a fonte usada no hero da aba Marketing
- O número exibido em “MQLs no período” vem de `pipefyVolumes` em `MarketingIndicatorsTab.tsx`.
- Hoje ele soma: Modelo Atual 107 + O2 TAX 0 + Franquia 92 + Oxy Hacker 1 = 200.
- Pelo Comercial, o Modelo Atual inclui também Outbound dentro da mesma BU; na aba Marketing o Outbound já é carregado, mas não entra em `pipefyVolumes`.

2. Espelhar exatamente a regra do acelerômetro Comercial
- Incluir `outboundGetCards('mql').length` no cálculo de MQLs da aba Marketing.
- Fazer o mesmo para as demais etapas (`leads`, `rm`, `rr`, `proposta`, `venda`) porque o Comercial trata Outbound como extensão do Modelo Atual, não como uma BU separada.
- Manter Franquia e Oxy Hacker usando `getQtyForPeriod`, como já está alinhado com o Comercial quando não há filtro de pessoa.

3. Validar no navegador como usuário final
- Abrir a aba Marketing no mesmo período.
- Confirmar que o card CPMQL/MQL deixa de mostrar 200 e passa a bater com o acelerômetro Comercial.
- Conferir console/logs para ver o breakdown final: Modelo Atual + Outbound + O2 TAX + Franquia + Oxy Hacker.

4. Escopo limitado
- Não mexer em planilha, metas, nem em banco.
- Não alterar a lógica de qualificação de MQL por BU; apenas alinhar a agregação da aba Marketing com a agregação Comercial.