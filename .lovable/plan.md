

User reporta que ainda não consegue digitar email em "Recuperar senha". Console mostra avisos de "Function components cannot be given refs" em vários lugares, incluindo `FormField` no Auth. Esses warnings são ruído antigo (vindos de `Toaster`, `O2Logo`, `Navigate`, etc.) e não causam o bug do input — mas o aviso específico em `FormField` no formulário de recovery indica que o `Input` não está recebendo o `ref` corretamente, o que pode estar quebrando o registro do react-hook-form e fazendo o valor digitado não persistir.

Olhando o código atual de `Auth.tsx`, o campo de email do forgot já tem o binding explícito (`name`, `ref`, `onBlur`, `onChange`, `value`). Então o que pode estar acontecendo:

1. O `Input` do shadcn pode não estar com `forwardRef` corretamente exportando o ref → testar lendo `src/components/ui/input.tsx`.
2. O `useEffect` que processa recovery roda no mount e chama `setMode('forgot')` quando o token é inválido — mas se não há token, não roda. OK.
3. **Causa mais provável**: o `useEffect` de redirect (`if (user && mode !== 'reset')`) — se houver uma sessão ativa qualquer (ex: o user logado tentando "esqueci minha senha" sem deslogar), o componente redireciona para `/` a cada render, fazendo o input perder estado/foco a cada keystroke. Mas a rota é `/auth`, então o user não está logado... a menos que esteja.
4. Outra causa: o re-render ao digitar dispara validação do zod, que pode estar resetando o form se schema mudar. Improvável.

Preciso investigar mais antes de mudar código.

## Plano

### Investigação
1. Ler `src/components/ui/input.tsx` para confirmar `forwardRef`.
2. Ler `src/components/ui/form.tsx` para ver como `FormField`/`FormControl` propagam ref.
3. Ler `src/hooks/useAuth.ts` para ver se há sessão sendo restaurada que faz o redirect disparar.

### Correção provável
Se o input estiver OK, o problema é o `useEffect` de redirect rodando enquanto o user está em `mode='forgot'` mas tem sessão ativa (ex: já logado). Vou:
- Adicionar `mode === 'login' || mode === 'signup'` como única condição de redirect (não redirecionar em `forgot` nem `reset`).
- Mover os `useForm` para fora do componente ou garantir que não sejam recriados.

Se o `Input` não tiver `forwardRef`, vou corrigir no `src/components/ui/input.tsx`.

### Validação
User abre `/auth` → "Esqueci minha senha" → digita email → texto permanece → envia link com sucesso.

