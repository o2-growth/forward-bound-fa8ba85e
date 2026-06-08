## 1. Resetar senha da Andrea Franzen

- Usuária: `andrea.franzen@o2inc.com.br` (id `b72f477f-0685-4d0b-9947-404bd0d119a5`)
- Nova senha: `Alterar@01`
- Execução via script Node usando `SUPABASE_SERVICE_ROLE_KEY` chamando `auth.admin.updateUserById`.

## 2. Tornar a explicação evidente nos cards do Pedrolo e da Mariana

Hoje a lógica especial (pontual do mês anterior conta como receita do mês atual) está só num tooltip do ícone ℹ️ — passa despercebido, principalmente quando o próprio Pedrolo ou a Mariana logam e veem apenas o card deles.

**Mudança em `src/components/planning/jornada/CfoView.tsx` (~linha 1118–1155):**

Quando o card for do Pedrolo ou da Mariana, adicionar logo abaixo do `CardHeader`, antes do conteúdo, um **banner âmbar persistente** (sempre visível, não hover) com:

```
┌──────────────────────────────────────────────┐
│ ℹ️  Como ler este squad                       │
│ Receita é pontual (não recorrente). O valor  │
│ fechado no mês anterior aparece como receita │
│ do mês atual. [+ texto específico Pedrolo/   │
│ Mari]                                        │
└──────────────────────────────────────────────┘
```

- Pedrolo: enfatiza Setup + SaaS OXY do mês passado.
- Mariana: enfatiza pontuais (Diagnóstico/Turnaround/Valuation) + Assessoria recorrente que fica todo mês.

Estilo: `border border-amber-500/40 bg-amber-500/10 text-xs rounded-md p-2` com ícone `Info` — chama atenção sem poluir.

O tooltip atual no ícone ℹ️ é removido (vira redundante), mas o ícone fica como âncora visual dentro do banner.

Demais cards (outros CFOs) continuam exatamente como estão hoje, sem banner.

## Detalhes técnicos
- Arquivo único alterado: `src/components/planning/jornada/CfoView.tsx`
- Senha reset: script `/tmp` usando `@supabase/supabase-js` admin client, descartado após uso.
- Nenhuma migração de banco necessária.
