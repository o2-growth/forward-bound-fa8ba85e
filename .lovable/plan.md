

## Correção: Edge Function "manage-redistribution" não deployada

### Problema
O erro "Failed to send a request to the Edge Function" indica que a função `manage-redistribution` não está deployada no backend. Confirmado pela ausência total de logs.

### Plano
1. **Deploy da edge function** `manage-redistribution` usando a ferramenta de deploy
2. **Testar** a função após o deploy para confirmar que está respondendo

Uma única ação resolve o problema — não há erro no código, apenas falta o deploy.

