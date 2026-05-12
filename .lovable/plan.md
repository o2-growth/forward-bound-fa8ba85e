## Causa raiz do erro

A edge function `analyze-churn-tratativa` consulta `pipefy_moviment_nps` usando colunas que **não existem** nessa tabela:

```sql
SELECT "ID","Título","Entrada","Fase Atual","NPS","CSAT","Sean Ellis","Comentario NPS","CFO Responsavel"
FROM pipefy_moviment_nps
```

Os nomes reais (vistos em `src/hooks/useNpsData.ts`) são: **`Nota NPS`**, **`Motivo da Nota`**, **`Sentimento Oxy`**. Daí o `column "NPS" does not exist` → 500 → "Edge Function returned a non-2xx status code".

## Mudanças

### 1. `supabase/functions/analyze-churn-tratativa/index.ts`
- Corrigir SELECT para `"Nota NPS"`, `"Motivo da Nota"`, `"Sentimento Oxy"` (remover `CSAT`, `Sean Ellis`, `Comentario NPS`).
- Atualizar `interface NpsRow` e o mapeamento `nps_recente` para `nota`, `motivo_nota`, `sentimento_oxy`.
- Envolver o bloco do NPS em `try/catch` — se falhar, segue sem NPS em vez de derrubar o post-mortem inteiro (defesa contra regressões futuras de schema).
- Atualizar o SYSTEM_PROMPT para referenciar `Nota NPS` / `Sentimento Oxy` em vez de `NPS`/`Sean Ellis`.

### 2. `src/components/planning/cs/ChurnAnalysisDrawer.tsx`
O JSON cru já é retornado e renderizado num `<details>` colapsado. Para atender ao pedido "tem que trazer também o JSON pra eu ver":
- Abrir o `<details>` por padrão (`open`) e mover para o topo do drawer (acima da análise IA), com contadores resumo: `nº fases tratativa · nº respostas NPS · cliente encontrado em Central de Projetos sim/não`.
- Botão "Copiar JSON" para inspeção rápida.

### Sem alterações
- Nenhuma migration ou mudança de banco — só nomes de coluna no SELECT.
- `useChurnTratativaAnalysis` e botão Sparkles continuam iguais.

Depois de aplicado, o "Regenerar" no drawer do Mineralis SA deve voltar 200 com `dossie` populado e a análise pronta.