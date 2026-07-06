# Restaurar Jun/2026 Modelo Atual em `funnel_metas`

## O que aconteceu (auditoria)

Verifiquei no `audit_log` da tabela `funnel_metas` — eu **não** toquei nela em nenhum momento. Minhas alterações foram apenas em `closer_absolute_metas` (metas por closer). O que inflou os medidores foram 8 UPDATEs feitos hoje (2026-07-06, entre 00:20 e 00:26) pelo usuário `pedro.albite@o2inc.com.br` na linha Jun/2026 Modelo Atual, pela UI (Plan Growth / redistribuição). A progressão registrada foi:

`mqls: 510 → 857 → 1204 → 1551 → 1898 → 2245 → 2592`
`rms: 204 → 343 → 482 → 621 → 760 → 898 → 1037`

As demais BUs (O2 TAX, Oxy Hacker, Franquia) permaneceram nos valores originais e não precisam de correção.

## Restauração

UPDATE em `funnel_metas` para `bu='modelo_atual' AND month='Jun' AND year=2026`, voltando aos valores anteriores à sessão de hoje:

| campo | valor |
|---|---|
| mqls | 510 |
| rms | 204 |
| rrs | 164 |
| propostas | 131 |
| vendas | 33 |

`faturamento_meta`, `is_locked` e demais campos ficam como estão.

## Validação

- SELECT confirmando os valores.
- No dashboard, sem filtro de closer, com período 01/06 a 30/06: Meta MQL deve cair para ~966 (510+57+149+250), RM ~338, Venda ~44, alinhado com Mai/Jul.

Nenhuma mudança de código.
