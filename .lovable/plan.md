
## Objetivo

Criar uma URL pública `/dash-g4` que qualquer pessoa possa acessar. Ao abrir, mostra uma tela pedindo senha. Se a senha bater, renderiza **apenas** o `G4ConsolidatedDashboard` (com KPIs, gráficos, tabela e drill-downs com links do Pipefy — igual à versão interna). Nada mais do dashboard interno aparece.

## Como vai funcionar

1. Rota nova `/dash-g4` **fora do `ProtectedRoute`** — sem exigir login Supabase.
2. Componente `PublicG4Dashboard` que:
   - Se não desbloqueado, mostra card centralizado pedindo senha.
   - Compara a senha digitada (hash SHA-256 no cliente) com um hash fixo embutido no bundle. Se bater, salva flag em `sessionStorage` (`g4-public-unlocked=1`) e libera.
   - Se desbloqueado, renderiza `<G4ConsolidatedDashboard />` em tela cheia, sem tabs/header do Planning2026.
3. O `G4ConsolidatedDashboard` já busca dados via edge function `g4-metrics`, que é publicamente invocável (não depende de sessão logada) — funciona sem auth. Nenhuma mudança no dashboard em si.
4. Botão "Sair" no topo que limpa o flag e volta para a tela de senha.

## Segurança — deixando claro

- Senha única compartilhada com hash no cliente é **proteção leve**, não segurança forte: alguém tecnicamente hábil consegue inspecionar o bundle e chegar no hash (mas não na senha em claro sem quebrar SHA-256). Os dados do `g4-metrics` continuam acessíveis por quem descobrir o endpoint.
- Se quiser proteção real depois, migramos para senha validada por edge function + rate-limit. Aqui vamos com o modelo simples que você pediu.

## Definir a senha

Preciso que você me diga qual senha usar (ex: `g4-2026`). Vou gerar o hash SHA-256 dela e colocar no código. Para trocar depois é só me pedir.

## Arquivos

**Novo:** `src/pages/PublicG4Dashboard.tsx`
- Tela de senha (Card + Input + Button, estilo do `Auth.tsx`).
- Após unlock, renderiza `<div class="min-h-screen p-6"><G4ConsolidatedDashboard /></div>`.
- Usa `sessionStorage` para persistir o unlock só durante a aba aberta.

**Editar:** `src/App.tsx`
- Adicionar `<Route path="/dash-g4" element={<PublicG4Dashboard />} />` antes do catch-all, **sem** `ProtectedRoute`.

## Fora do escopo

- Não mexer no dashboard interno nem no `G4ConsolidatedDashboard`.
- Não criar login/cadastro nem tabela de usuários públicos.
- Não alterar RLS nem a edge function `g4-metrics`.

## Próximo passo

Me diga a senha que quer usar e eu implemento.
