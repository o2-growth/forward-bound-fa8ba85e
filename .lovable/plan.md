# Criar 4 contas restantes + senhas aleatórias para os 13 analistas

## Contas a criar

Mesma arquitetura "CFO locked view" (role `cfo` + entrada em `cfo_user_mapping` apontando para o CFO do squad):

| Analista | E-mail | CFO/Squad |
|---|---|---|
| Eric Alves da Silveira | eric.silveira@o2inc.com.br | *(definir — não está mapeado)* |
| Pedro Oppermann Michelucci Pimenta | pedro.pimenta@o2inc.com.br | *(definir)* |
| Maria Eduarda Nery Reckziegel | eduarda.nery@o2inc.com.br | **Carolina Mendes** (já está como Estagiária FP&A no squad da Carol no CfoView) |
| Raissa Bonamigo Daros | raissa.daros@o2inc.com.br | **Mariana Luz da Silva** (já está como Estagiária FP&A no squad da Mariana) |

> Preciso confirmar o squad/CFO de **Eric Silveira** e **Pedro Michelucci** — eles não aparecem hoje na lista de membros de nenhum CFO no `CfoView.tsx`. Vou perguntar abaixo.

## Senhas aleatórias

Gerar uma senha forte aleatória (16 chars, mistura maiúscula/minúscula/número/símbolo) **única por usuário** para **todos os 13 analistas** (os 9 já criados + os 4 novos), substituindo a `Alterar@01` atual via `auth.users` update com hash bcrypt.

Entrega: lista `Nome → e-mail → senha` aqui no chat para você repassar individualmente.

## Passos

1. Migration: criar os 4 usuários novos (auth.users + user_roles 'cfo' + cfo_user_mapping).
2. Migration: atualizar `encrypted_password` dos 13 com senhas aleatórias geradas.
3. Devolver a tabela final no chat.

## Pergunta antes de executar

Para quais CFOs/squads devo vincular **Eric Silveira** e **Pedro Michelucci**? (Ex.: Gustavo Cochlar, Eduardo D'Agostini, Carolina Mendes, Mariana Luz, etc.)
