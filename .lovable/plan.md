## Objetivo

Analistas (role `cfo`) não devem ver a aba **CFOs** dentro da Operação/Jornada. Devem continuar vendo Pipeline, Clientes, Entrega e Alertas.

## Mudança

Arquivo único: `src/components/planning/JornadaTab.tsx`

1. Importar `useUserPermissions` e ler `isCfo`.
2. Renderizar condicionalmente o `<TabsTrigger value="cfos">` e o `<TabsContent value="cfos">` apenas quando `!isCfo`.
3. Ajustar o `grid-cols-5` do `TabsList` para `grid-cols-4` quando a aba CFOs estiver oculta (analistas veem 4 abas; admins/usuários normais veem 5).

Admin continua vendo a aba normalmente — somente quem tem a role `cfo` (analistas) terá a aba escondida.

Nenhuma outra tela é afetada.