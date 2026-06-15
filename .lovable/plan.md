## Objetivo
Criar a conta do Matheus Reis com a senha `Alterar@01`.

## Execução
Chamar a edge function `admin-create-user` com:
- `email`: `matheus.reis@o2inc.com.br`
- `password`: `Alterar@01`
- `full_name`: `Matheus Reis`

O trigger `handle_new_user` cria automaticamente `profiles` e atribui o role default `user`.

## Validação
Confirmar resposta 200 e consultar `profiles` para garantir que o registro foi criado.

## Fora do escopo
Atribuição de role específico (admin/cfo/etc) ou permissões de aba — pode ser feito depois pela aba Admin.