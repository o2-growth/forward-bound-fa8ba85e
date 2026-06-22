## Problema
Na tela "Recuperar senha" o campo de e-mail não permite digitação e o DevTools mostra `label for doesn't match any element id`.

## Causa
Em `src/pages/Auth.tsx` (linhas 215–224), o `<Input>` da tela `forgot` está com as props do `field` desestruturadas manualmente:

```tsx
<Input
  type="email"
  ...
  name={field.name}
  ref={field.ref}
  onBlur={field.onBlur}
  onChange={field.onChange}
  value={field.value ?? ''}
/>
```

Isso quebra a integração do shadcn `FormControl`, que injeta o `id` no input via Context. Resultado:
1. O `<FormLabel>` aponta para um `id` que não existe → warning de a11y.
2. A validação do zod dispara em loop com `mode` padrão, junto com a renderização desconectada do RHF, fazendo o campo parecer "travado" para digitação.

Telas de login e cadastro **não têm esse problema** porque usam `{...field}`.

## Correção (1 arquivo, 1 trecho)
Substituir o `<Input>` do formulário `forgot` para usar o mesmo padrão das outras telas:

```tsx
<Input
  type="email"
  placeholder="seu@email.com"
  autoComplete="email"
  {...field}
  value={field.value ?? ''}
/>
```

## Escopo
- **Arquivo:** `src/pages/Auth.tsx` (apenas o bloco do `case 'forgot'`).
- **Não mexer em:** lógica de envio (`handleForgotPassword`), `useAuth`, demais formulários, edge functions ou backend.
- **Sem mudanças em:** estilos, layout escuro, design system.

## Verificação
- Abrir `/auth` → "Esqueci minha senha".
- Digitar um e-mail → o campo aceita digitação e o aviso de label some.
- Clicar em "Enviar link de recuperação" → toast de sucesso (fluxo já testado anteriormente).
