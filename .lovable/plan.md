## Diagnóstico

O Cenário de Caixa ainda está preso ao período em parte do fluxo. O `includeAllOpenIgnoringPeriod` só removeu o filtro dentro do agregador, mas os hooks de dados de Modelo Atual e Expansão/Franquia/Oxy Hacker ainda buscam cards usando `startDate/endDate`. Então cards abertos fora do período não chegam ao Cenário de Caixa.

Além disso, Outbound hoje entra com `mrr/setup/pontual = 0` no detalhe, mesmo quando existe valor do negócio. Isso explica cards aparecendo com caixa zerado e mantendo o valor igual ao cenário anterior.

## Plano de correção

1. **Modelo Atual**
   - Buscar também o pipeline aberto global via `query_open_pipeline`, sem filtro de período.
   - Hidratar histórico desses IDs para garantir valores completos.
   - Expor uma lista separada `allOpenCards` para uso exclusivo no Cenário de Caixa.

2. **Franquia e Oxy Hacker**
   - Incluir `query_open_pipeline` na busca compartilhada de Expansão.
   - Hidratar histórico dos cards abertos, não só dos cards do período.
   - Expor `allOpenCards` filtrado por produto, preservando a lógica atual do funil normal.

3. **Outbound**
   - Ajustar `toDetailItem` para não zerar caixa: usar `valor` como `pontual` quando não houver MRR/Setup/Pontual estruturado.
   - Assim a regra do Cenário de Caixa aplicará 50% sobre esse valor, em vez de R$ 0.

4. **Cenário de Caixa**
   - Fazer o agregador usar `allOpenCards` quando `includeAllOpenIgnoringPeriod` estiver ativo.
   - Manter a Temperatura dos Leads usando o comportamento antigo, respeitando o período.

5. **Validação**
   - Verificar no preview que mudar o período não muda os totais/cards do Cenário de Caixa.
   - Abrir detalhes e confirmar que novos cards abertos não aparecem zerados quando há valor disponível.
   - Confirmar que Monetização continua R$ 0 no Cenário de Caixa por regra atual de caixa.