## Objetivo
No diálogo de detalhamento do G4 Real, todo lead deve ter um link clicável para abrir o Pipefy e ver o card, mesmo quando o campo `pipefy_url` original está vazio.

## Problema atual
- `LiveDetailDialog.tsx` já exibe um ícone de link na última coluna, mas só quando `l.pipefyUrl` está preenchido.
- Muitos leads vêm com `pipefy_url` nulo de `g4_leads_360`, então o link não aparece.

## Solução

### 1. Backend — enriquecer `pipefy_url` pelo email
No Edge Function `supabase/functions/g4-metrics/index.ts`, no CTE `pipe`, também buscar o `ID` do card mais recente em `pipefy_moviment_cfos` para montar a URL direta:

```text
pipe AS (
  SELECT DISTINCT ON (lower("E-mail"))
    lower("E-mail") AS email,
    "Faixa de faturamento mensal" AS faixa,
    ...,
    "ID" AS card_id
  FROM pipefy_moviment_cfos
  WHERE "E-mail" IS NOT NULL AND "E-mail" <> ''
  ORDER BY lower("E-mail"), "Entrada" DESC NULLS LAST
)
```

Na query final, montar a URL com fallback:

```text
COALESCE(l.pipefy_url, 'https://app.pipefy.com/open-cards/' || p.card_id) AS pipefy_url
```

Isso garante que leads com card no Pipefy tenham link direto mesmo que `g4_leads_360.pipefy_url` esteja vazio.

### 2. Frontend — link sempre visível
Em `src/components/planning/g4/LiveDetailDialog.tsx`:

- Se `pipefyUrl` existir, abrir direto.
- Se não existir, mas houver `email`, montar link de busca no Pipefy:
  `https://app.pipefy.com/search?query=<email>`.
- Substituir o ícone pequeno da última coluna por um botão "Abrir no Pipefy" na célula de ações, sempre habilitado quando houver link.
- Se não houver nem URL nem email, mostrar "—".

## Arquivos alterados
- `supabase/functions/g4-metrics/index.ts`
- `src/components/planning/g4/LiveDetailDialog.tsx`

## Validação
- Redeploy do Edge Function `g4-metrics`.
- Teste via `curl` no endpoint `/g4-metrics` verificando que `pipefyUrl` vem preenchido para leads que têm card.
- Verificação visual no diálogo de detalhamento: botão "Abrir no Pipefy" aparece em todas as linhas com email ou URL.