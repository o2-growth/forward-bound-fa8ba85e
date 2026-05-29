## Objetivo

Criar contas de acesso para 7 CFOs. Cada um, ao logar, verá **apenas a aba Operação** filtrada pela sua carteira (mesma lógica do Eduardo Dagostini, já em produção via `CFO Access Lock` + `get_my_cfo_name`).

## Contas a criar

| # | Email | Nome (no Pipefy) | Status |
|---|---|---|---|
| 1 | `douglas.schossler@o2inc.com.br` | Douglas Pinheiro Schossler | criar |
| 2 | `rafael.marchioretto@o2inc.com.br` | Rafael Marchioretto Bokorni | criar |
| 3 | `oliveira@o2inc.com.br` | Adivilso Souza de Oliveira Junior | criar |
| 4 | `everton.bisinella@o2inc.com.br` | Everton Bisinella | criar |
| 5 | `gustavo.cochlar@o2inc.com.br` | Gustavo Ferreira Cochlar | criar |
| 6 | `mariana.luz@o2inc.com.br` | Mariana Luz da Silva | criar |
| 7 | `joseane.sartori@o2inc.com.br` | **Joseane Sartori** ⚠️ confirmar grafia exata no Pipefy | criar |

**Senha inicial (todos):** `Alterar@01` (mesma do Dagostini).

**Não criados** (sem email enviado ou sem perfil de CFO):
- Eduardo Milani Pedrolo (sem email)
- `marcio.goncalves`, `diego.rosales`, `marcelo.ritter` (não têm perfil de CFO no Pipefy — confirmado por você)

## Execução (por usuário, 7×)

Cada criação faz **3 operações**, idênticas ao fluxo da aba "Acessos CFO" (`CfoMappingTab.tsx`):

1. **Edge function `create-user`** → cria conta no Auth com `email_confirm: true`, sem permissões de aba.
2. **`user_roles`** → remove `user`/`admin` do user_id recém-criado e insere `role = 'cfo'`.
3. **`cfo_user_mapping`** → insere `{ user_id, cfo_name }` com o nome exato do Pipefy.

Resultado: ao logar, o `ProtectedRoute` detecta role `cfo` → bloqueia todas as abas exceto **Operação**; a Operação filtra clientes via `get_my_cfo_name()` cruzando com `CFO Responsavel` no Pipefy.

## Validação pós-execução

- Conferir 7 linhas em `cfo_user_mapping` + 7 roles `cfo` em `user_roles`.
- Você loga com 1 conta de teste (ex.: Joseane) e valida que vê só a carteira dela.

## Riscos / pontos de atenção

- **Joseane**: como o nome dela não aparece no código (`CFO_SQUADS` só tem 8 nomes), preciso da grafia exata como aparece no campo "CFO Responsavel" do Pipefy. Posso assumir **"Joseane Sartori"** — se estiver diferente (ex.: "Joseane Sartori da Silva"), o mapping não bate e ela vê carteira vazia. Confirma?
- Squad UI: Joseane não aparece em `CFO_SQUADS` na `CfoView` (custos/squad). Isso não bloqueia o acesso dela, mas a tela de squads não mostrará o time dela até cadastrarmos. **Fora do escopo agora** — pode ser feito depois.

## Após sua aprovação

Vou executar tudo numa única sequência (sem perguntar de novo). Envio no final a lista de credenciais pra você repassar aos CFOs.
