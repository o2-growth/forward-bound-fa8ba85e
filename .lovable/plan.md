## Liberar aba "CFOs" para usuários com role `cfo` (escopo bloqueado ao próprio squad)

### Problema
O Pedrolo (role `cfo`, mapeado em `cfo_user_mapping` como "Eduardo Milani Pedrolo") só vê a aba **Operação**, mas dentro dela a sub-aba **CFOs** está escondida. Hoje:

```ts
const canViewCfoTab = isAdmin && !isCfo;
```

→ qualquer um com role `cfo` é bloqueado da sub-aba, mesmo já existindo um `useEffect` que força o filtro `filters.cfos = [lockedCfoName]` quando `isCfo` é true.

### Mudança
Em `src/components/planning/CustomerSuccessTab.tsx`:

1. Trocar a regra para:
   ```ts
   const canViewCfoTab = isAdmin || isCfo;
   ```
   Assim admins continuam vendo tudo, e CFOs passam a ver a sub-aba já travada no próprio nome (a trava do filtro `cfos = [lockedCfoName]` que já existe garante que ele só enxergue o squad/clientes dele).

2. Manter o `useEffect` de redirect (linhas 50–54) inalterado — ele já não dispara para CFOs depois da mudança.

3. Sem alterações em RLS, hooks de dados ou no `CfoView` — o componente já respeita `filters.cfos`, então listará apenas Eduardo Milani Pedrolo.

### Resultado esperado
- Pedrolo abre `Operação → CFOs` e vê só o card/visão dele e do squad dele.
- Admins seguem com a visão completa.
- Demais usuários (sem role `cfo` e sem admin) continuam sem a sub-aba.

Nenhuma migração, nenhum dado tocado.