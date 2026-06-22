## Diagnóstico

O fluxo de UI já existe em `src/pages/Auth.tsx` (botão "Esqueci minha senha" → form → `supabase.auth.resetPasswordForEmail` → tela `/auth?mode=reset`). O que "n funfa" é o **envio do email**: o SMTP padrão do Auth no Lovable Cloud tem rate limit baixo e nem sempre entrega para domínios corporativos (`@o2inc.com.br`). Não temos como abrir o painel para trocar SMTP/Site URL.

## Solução

Trocar o envio do email pelo **sistema transacional do Lovable** (mesma infra que já usamos) e gerar o link de recovery via Edge Function com service role. Assim o email sempre sai, com remetente verificado, e o link continua sendo um recovery token nativo do Auth (o fluxo `/auth?mode=reset` existente continua valendo, **nada do que funciona hoje muda**).

## Mudanças

### 1. Edge Function nova: `send-password-recovery`
- Pública (sem JWT — qualquer um na tela de login pode chamar).
- Entrada: `{ email }`.
- Lógica:
  1. Valida formato e busca o usuário (`auth.admin.listUsers` filtrando por email; se não existir, responde 200 silenciosamente para não vazar quais emails são cadastrados).
  2. Gera link de recovery: `supabase.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: '<origin>/auth?mode=reset' } })`. O `origin` vem do header `Origin`/`Referer` (fallback para `https://dashboard.o2inc.com.br`).
  3. Envia email via `send-transactional-email` (Lovable Emails) com template HTML simples e botão "Redefinir senha" apontando para o `action_link` retornado.
- Adicionar em `supabase/config.toml` com `verify_jwt = false`.

### 2. Infra de email transacional
- Garantir que `email_domain--scaffold_transactional_email` esteja aplicado (cria `send-transactional-email`). Se já existir, reusar.
- Requer domínio de email configurado. Como setup de domínio exige admin de workspace, se ainda não houver, o agente vai exibir o diálogo `<presentation-open-email-setup>` para o usuário concluir antes de continuar.

### 3. Frontend (mudança mínima e isolada)
- Em `src/pages/Auth.tsx`, `handleForgotPassword` passa a chamar a nova Edge Function (`supabase.functions.invoke('send-password-recovery', { body: { email } })`) **em vez de** `resetPassword(email)`.
- Tudo o resto (toast, modo, tela `reset`, processamento do hash `type=recovery`) fica idêntico.
- `useAuth.resetPassword` permanece exportado (não remove) para não quebrar nada externo.

### 4. Sem mudanças em
- Banco, RLS, tabelas, outras telas, login normal, signup, troca de senha autenticada (`ChangePasswordDialog`), reset via Admin (`admin-reset-password`).

## Fluxo final do usuário

```text
Login → "Esqueci minha senha" → digita email
   → Edge Function gera link de recovery + envia via Lovable Emails
   → Usuário recebe email com botão
   → Clica → /auth?mode=reset (hash com tokens)
   → Auth.tsx detecta type=recovery, abre form "Nova senha"
   → updateUser({ password }) → redireciona para /
```

## Detalhes técnicos

- Resposta da função sempre `{ ok: true }` (não vaza existência de email).
- CORS liberado para origins do projeto.
- Template do email: HTML inline simples com nome do app ("Dashboard O2"), botão e link textual de fallback.
- Sem novas dependências npm.
