# Acesso restrito por usuário CFO

Cada usuário com perfil "CFO" entra no sistema e vê **somente a aba Operação**, com **todas as sub-abas** (Visão Geral, Clientes, CFOs, Reuniões, NPS, Churn, Alertas) **automaticamente filtradas pelo seu próprio nome** no Pipefy. Continua tendo acesso ao chat de IA para os seus clientes.

## 1. Banco de dados

**Migração nova** (somente schema, nada de UPDATE/DELETE em dados existentes):

- Adicionar valor `'cfo'` ao enum `app_role` (já existe `admin` e `user`).
- Criar tabela `cfo_user_mapping`:
  - `id uuid PK`, `user_id uuid` (referência lógica a `auth.users`), `cfo_name text` (igual ao "CFO Responsavel" do Pipefy), `created_at`, `updated_at`, único por `user_id` e único por `cfo_name`.
  - GRANTs: `authenticated` SELECT/INSERT/UPDATE/DELETE; `service_role` ALL.
  - RLS:
    - Admin: tudo (`has_role(auth.uid(),'admin')`).
    - Usuário: só lê o próprio (`user_id = auth.uid()`).
- Função `public.get_my_cfo_name()` (SECURITY DEFINER, stable) que retorna `cfo_name` do `auth.uid()` atual. Usada pelo frontend via RPC para descobrir o nome travado.

> Mapeamento por email: feito automaticamente no momento em que o admin cria/edita o usuário (UI escreve `user_id + cfo_name` na tabela). Não há trigger em `auth.users` — toda a escrita passa por `manage-user` (já existe) ou pela nova aba admin.

## 2. Permissões e roteamento

**`useUserPermissions.ts`**
- Quando `role === 'cfo'`: retornar `allowedTabs = ['cs']` (única aba liberada) e `isCfo = true`. Ignorar `user_tab_permissions` para esse role.

**`Planning2026.tsx`**
- `defaultTab` continua sendo o primeiro de `visibleTabs` (vai cair em `cs`).
- Esconder o botão "Mostrar abas ocultas" quando `isCfo`.

## 3. Aba Operação travada no CFO

**`CustomerSuccessTab.tsx`**
- Buscar `cfoName` via `supabase.rpc('get_my_cfo_name')` no mount quando `isCfo`.
- Se `isCfo && cfoName`:
  - `useEffect` força `setFilters({ cfos: [cfoName] })` no mount e bloqueia mudanças (handler vira no-op).
  - Renderiza o `Select` de CFO como **disabled** mostrando só o nome do CFO (sem opção "Todos"); ou substitui por um Badge fixo.
  - Esconde o botão "Limpar" filtros.
  - Mantém demais filtros (produto, datas, quarters) editáveis.
- Se `isCfo && !cfoName`: mostra mensagem "Usuário sem mapeamento de CFO — contate o administrador" e não renderiza sub-abas.

**Filtragem efetiva** (já existe, só precisa garantir que `filters.cfos` está sempre setado):
- `filteredClientes`, `filteredCfos`, `filteredPipeline`, `filteredAlertas`, `filteredReunioes` e `filteredNpsData` já respeitam `filters.cfos` → nada a refatorar na lógica de dados.
- `ChurnDossierSection` e `CfoView` também derivam de `filteredClientes`/`filteredCfos`, então herdam o corte.

## 4. Admin: nova aba "Usuários CFO"

**`AdminTab.tsx`** + novo componente `CfoMappingTab.tsx`:
- Tabela mostrando: email do usuário, nome do CFO mapeado, ações (editar/remover).
- Botão "Vincular usuário a CFO":
  - Select de usuário (lista de `profiles` que tenham role `cfo` — ou opção de promover um usuário existente a `cfo`).
  - Select de `cfo_name` (lista vinda de `useJornadaData().allCfos`).
  - Salva em `cfo_user_mapping` via insert/upsert; se a role atual não for `cfo`, troca para `cfo` (apaga `user` / `admin`).
- Ao remover o vínculo, opcional: reverter role para `user`.

**`EditUserDialog.tsx`** / **`CreateUserForm.tsx`**: adicionar opção "Tipo de acesso: Padrão / Admin / **CFO**". Quando "CFO", esconde checklist de tabs e mostra select de `cfo_name`.

**`manage-user` Edge Function**: aceitar `role: 'cfo'` e `cfoName: string` no payload de create/update; gravar em `user_roles` e `cfo_user_mapping` em transação simples (duas chamadas service_role).

## 5. Chat de IA

Sem mudanças. `AIChatDrawer` continua disponível dentro de Operação para os clientes que o CFO vê. RLS de `ai_conversations`/`ai_messages` já restringe por `auth.uid()`.

## 6. Verificação

- `tsc` typecheck.
- Supabase linter após a migração.
- Teste manual: criar usuário `cfo@teste`, mapear a um nome existente em `allCfos`, logar:
  - vê só a aba Operação;
  - select de CFO travado no nome dele;
  - clientes/reuniões/NPS/churn mostram só os dele;
  - tentar trocar role/mapeamento via UI sem ser admin → bloqueado por RLS.

## Detalhes técnicos

```text
auth.users (id) ─┬─► user_roles(user_id, role='cfo')
                 └─► cfo_user_mapping(user_id, cfo_name)
                              │
                              ▼
                     get_my_cfo_name() RPC
                              │
                              ▼
              CustomerSuccessTab força filters.cfos=[cfoName]
```

Arquivos tocados: migration nova; `useUserPermissions.ts`; `Planning2026.tsx`; `CustomerSuccessTab.tsx`; `AdminTab.tsx` + novo `CfoMappingTab.tsx`; `EditUserDialog.tsx`; `CreateUserForm.tsx`; `supabase/functions/manage-user/index.ts`.

Fora do escopo: alterar Edge Functions de IA, criar `/chats` hub, mexer em outras abas, mudar dados existentes.
