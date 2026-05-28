Redeploy a edge function `query-external-db` no projeto Supabase para publicar a versão atual do arquivo `supabase/functions/query-external-db/index.ts` (que já inclui `pipefy_moviment_outbound` na whitelist `validTables`).

Nenhuma alteração de código será feita. Apenas o deploy.

Após o deploy, validar chamando a função via curl com `action: preview` na tabela `pipefy_moviment_outbound` para confirmar que não retorna mais "Invalid table name", e checar os logs.