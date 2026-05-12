## Alteração

No `src/components/planning/nps/ChurnDossierSection.tsx`, na seção expandida da linha do dossiê de churn:

- Renomear o label **"Problemas com a Oxy"** para **"Feedback NPS"**.
- Manter o mesmo mapeamento: continua exibindo `{row.problemasOxy || 'Não informado'}`.

Nenhuma mudança em hooks, tipos ou edge functions — só o texto do label.