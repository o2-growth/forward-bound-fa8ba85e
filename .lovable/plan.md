## Diagnóstico

Confirmei: você está certa — **100% dos clientes ativos da Mariana Luz estão em produtos pontuais** (Diagnóstico Estratégico, Valuation). Conferi no Pipefy:

| Cliente | Produto (DB) | Valor CFOaaS | Outros |
|---|---|---|---|
| Samba Decor | Diagnóstico Estratégico | **R$ 9.000** | — |
| ESPÓLIO DE MÁRCIO | Diagnóstico Estratégico | **R$ 15.000** | — |
| UFFA | Diagnóstico Estratégico | **R$ 45.000** | — |
| ARA | Diagnóstico Estratégico | R$ 7.870 | — |
| IDB Hospitais | Setup + Valuation | 0 | Valuation R$ 18.000 |
| (15 outros) | Diagnóstico Estratégico | 0 | — |

A causa do erro de cadastro no Pipefy (CFOaaS preenchido em vez de Valor Diagnóstico) **já está sendo corrigida no hook** `useJornadaData.ts` (linha 302): quando `isPontualOnly = true`, o `Valor CFOaaS` é redirecionado de `mrr` para `pontual`. Ou seja, internamente o Samba Decor já chega na UI como `mrr=0, pontual=9000`. ✅

## Onde está o bug de verdade

Em `src/components/planning/jornada/CfoView.tsx` (linhas 1370-1375), a renderização das colunas está trocada:

```tsx
{/* Coluna "Fee Mensal" */}
<TableCell className="text-right">
  {c.mrr > 0 ? formatBRL(c.mrr) 
    : c.pontual > 0 ? <span className="text-purple-600">{formatBRL(c.pontual)}</span>  // ← MOSTRA PONTUAL AQUI
    : "—"}
</TableCell>

{/* Coluna "Pontual" */}
<TableCell className="text-right text-purple-600">
  {c.mrr > 0 && c.pontual > 0 ? formatBRL(c.pontual) 
    : c.mrr > 0 ? "—" 
    : "—"}  // ← SEMPRE "—" quando não há MRR
</TableCell>
```

**Resultado**: clientes 100% pontuais (sem MRR) têm o pontual renderizado **na coluna "Fee Mensal"** (em roxo), e a coluna "Pontual" mostra `—`. Por isso o screenshot tem Samba R$ 9.000 / Espólio R$ 15.000 em Fee Mensal (em roxo) e `—` em Pontual.

## Correção

Separar limpamente as duas colunas, sem a "fusão" condicional:

```tsx
{/* Fee Mensal: só MRR recorrente */}
<TableCell className="text-right">
  {c.mrr > 0 ? formatBRL(c.mrr) : "—"}
</TableCell>

{/* Pontual: só pontual */}
<TableCell className="text-right text-purple-600">
  {c.pontual > 0 ? formatBRL(c.pontual) : "—"}
</TableCell>
```

Com isso, a Mariana passará a mostrar **todos os fees corretamente em "Pontual"** (Samba R$ 9k, Espólio R$ 15k, UFFA R$ 45k, ARA R$ 7,87k, IDB R$ 18k) e Fee Mensal vai aparecer `—` para todos eles, refletindo a realidade (carteira 100% de serviços pontuais).

## Observação adicional (não é bug, só esclarecimento)

- O **ARA** está em fase "Em Tratativa" (não "Serviços Pontuais") e por isso aparece com `Valor CFOaaS = 7.870` que será redirecionado para Pontual com a correção, **desde que** o produto continue sendo "Diagnóstico Estratégico" (está). ✅
- O **IDB Hospitais** tem produtos "Setup + Valuation". Como "Setup" não está na lista `PONTUAL_ONLY_PRODUCTS`, `isPontualOnly` retorna `false`, mas como o Valor CFOaaS é zero e o Valor Valuation = 18k, ele acaba indo certo para `pontual`. Funcionará bem.

## Arquivos alterados

- `src/components/planning/jornada/CfoView.tsx` (apenas as 2 células de tabela, linhas 1370-1375)

Não há mudança de lógica de negócio nem de hook — é puramente correção da renderização nas colunas do diálogo.
