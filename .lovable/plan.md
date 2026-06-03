## Escopo

3 mudanças:

1. **Criar acessos dos 9 analistas** com a mesma visão "trancada" do CFO do squad deles
2. **Ocultar a aba "CFOs"** e **os badges de ranking** para usuários com role `cfo` (CFOs e analistas)
3. **Atualizar meta de margem** de 65% → **54%**

---

### 1. Criar contas dos analistas

Reutilizar a arquitetura existente do "CFO Access Lock" (role `cfo` + `cfo_user_mapping` → `get_my_cfo_name()` força filtro no CS). Cada analista vira um usuário `cfo` mapeado para o **mesmo `cfo_name`** do seu líder de squad → herda automaticamente toda a visão do CFO.

**Senha padrão:** `Alterar@01` (mesmo padrão da Kethlin/Amanda/Carlos).

| Analista | Email | Mapear para CFO |
|---|---|---|
| Pedro Fuzer Garcia | pedro.fuzer@o2inc.com.br | Adivilso Souza de Oliveira Junior |
| Tainara Sofia Konzen | tainara.konzen@o2inc.com.br | Douglas Pinheiro Schossler |
| Sergio Pereira Piva Junior | sergio.piva@o2inc.com.br | Eduardo Milani Pedrolo |
| Felipe Vargas Brenner | felipe.brenner@o2inc.com.br | Eduardo Milani Pedrolo |
| Anderson Felizardo Mendes | anderson.mendes@o2inc.com.br | Everton Bisinella |
| Humberto de Azevedo Behs | humberto.behs@o2inc.com.br | Gustavo Ferreira Cochlar |
| Pamela Luiza dos Santos Quadros | pamela.quadros@o2inc.com.br | Luis Eduardo Dagostini |
| Matheus da Silva Besnos | matheus.besnos@o2inc.com.br | Luis Eduardo Dagostini |
| Roberta Costa Curta Lirio | roberta.costa@o2inc.com.br | Mariana Luz da Silva |

> Faltaram e-mails de: Eric Silveira, Pedro Michelucci, Maria Eduarda Reckziegel e Raissa Daros — vou pular esses 4. Me passa depois se quiser que eu crie.

Para cada um:
- Criar usuário no auth com a senha `Alterar@01` (email confirmado)
- Inserir role `cfo` em `user_roles`
- Inserir mapeamento em `cfo_user_mapping` com o `cfo_name` exato do líder de squad
- Sem permissões em `user_tab_permissions` (a lógica de CFO já força só a aba Operação)

---

### 2. Esconder aba "CFOs" e rankings para role `cfo`

- **`JornadaTab.tsx` / `CustomerSuccessTab.tsx`**: usar `useUserPermissions().isAdmin` para condicionalmente renderizar o `TabsTrigger value="cfos"` e o `TabsContent value="cfos"` (só admin vê).
- **`CfoView.tsx`**: aceitar prop `showRankings` (default `true`). Em todos os ~9 pontos com `rankBadge(...)` (linhas 1029, 1035, 1041, 1049, 1057, 1066, 1083, 1085), só renderizar quando `showRankings === true`. Quando admin abre a aba CFOs ela já passa `true` por padrão; nos pontos onde `CfoView` é montado fora da aba (se houver), passar `isAdmin`.

---

### 3. Meta de margem 65% → 54%

Em `src/components/planning/jornada/CfoView.tsx`, linha 124:
```ts
margemTarget: 65,  →  margemTarget: 54,
```
Isso atualiza automaticamente o label "Meta: 54%" e a coloração das margens.

---

### Resumo técnico

- **DB (migration desnecessária)** — só inserts: 9 usuários no `auth.users`, 9 linhas em `user_roles` (role=`cfo`), 9 linhas em `cfo_user_mapping`.
- **Código** — 3 arquivos: `CfoView.tsx` (target 54 + prop `showRankings`), `JornadaTab.tsx` e `CustomerSuccessTab.tsx` (gate da aba CFOs por `isAdmin`).
- **Sem mudanças** em RLS, edge functions ou hooks — a engrenagem `cfo` + `get_my_cfo_name()` já existe e cobre os analistas automaticamente.