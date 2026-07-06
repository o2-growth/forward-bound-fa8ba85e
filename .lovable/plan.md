## Correção do Closer do card 1341215587

Trocar o valor do campo `vendedor_respons_vel` de **"Thiago Santana"** para **"Thiago Zanoni"** no banco espelho (`pipefy_moviment_outbound`) para o card `1341215587`.

### Passos

1. Chamar a edge function `query-external-db` com a ação `update_field`:
   - `table`: `pipefy_moviment_outbound`
   - `card_id`: `1341215587`
   - `field`: `vendedor_respons_vel`
   - `value`: `Thiago Zanoni`
2. Validar via `curl_edge_functions` que todas as linhas do card agora retornam `vendedor_respons_vel = "Thiago Zanoni"`.
3. SDR (Matheus Staruck) permanece inalterado.

### Observação
Alteração feita apenas no banco espelho consumido pelo dashboard. Após atualizar, será necessário refresh da página para invalidar o cache do React Query e ver "Thiago Zanoni" como Closer no GSC.
