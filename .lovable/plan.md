# Conta CFO — Eduardo Dagostini

## Mapeamento descoberto

Busquei no código e na base. O Eduardo aparece com 2 grafias no Pipefy/dados, **já normalizadas** para um único nome canônico:

- "Luis Eduardo Dagostini" → `useJornadaData.ts:43` remapeia para **"Eduardo D'Agostini"**
- "Eduardo D'Agostini" → nome canônico usado em todos os filtros, NPS, Jornada e Operação

**Equipe dele (squad em `CfoView.tsx`):** Pamela Luiza dos Santos Quadros e Matheus da Silva Besnos — ambos Analistas FP&A. **Não são CFOs próprios** (não aparecem como "CFO Responsavel" no Pipefy), então não precisam ser mapeados separadamente. Os clientes do squad já são atribuídos ao Eduardo D'Agostini como CFO Responsavel — ou seja, ao filtrar pelo nome dele, o Eduardo automaticamente vê tudo que a equipe dele opera.

> Conclusão: **1 nome basta** — `Eduardo D'Agostini`. Não é preciso mexer no schema para múltiplos nomes.

## Passos

### 1. Criar a conta de auth
Chamar a edge function `manage-user` (action `create`):
- email: `eduardo.dagostini@o2inc.com.br`
- password: `Alterar@01`
- fullName: `Eduardo Dagostini`
- permissions: `[]` (CFO ignora permissions, vai cair na aba Operação automaticamente via `useUserPermissions`)

Isso cria o auth user e, pelo trigger `handle_new_user`, gera profile + role `user`.

### 2. Vincular ao CFO no Pipefy
Via `supabase--insert`:
- Trocar role `user` → `cfo` na tabela `user_roles` (delete + insert)
- Inserir em `cfo_user_mapping`: `(user_id, cfo_name = "Eduardo D'Agostini")`

A partir daí:
- `useUserPermissions` detecta role=cfo → `allowedTabs=['cs']` (só Operação)
- `useMyCfoName` retorna `"Eduardo D'Agostini"` via RPC `get_my_cfo_name()`
- `CustomerSuccessTab` força `filters.cfos = ["Eduardo D'Agostini"]` em todas as sub-abas (Clientes, Reuniões, NPS, Alertas, CFOs, Churn), filtro fica desabilitado, botão "Limpar" oculto

### 3. Verificação
- Confirmar que a conta foi criada (`SELECT FROM profiles WHERE email='eduardo.dagostini@o2inc.com.br'`)
- Confirmar role=cfo e mapeamento inseridos
- Eduardo loga com `Alterar@01` → cai direto na aba Operação, só com clientes/NPS/rotinas dele

## Sem mudanças de schema ou código
Toda a infraestrutura ("CFO Access Lock") já está pronta da implementação anterior. Esta é uma operação puramente de dados.
