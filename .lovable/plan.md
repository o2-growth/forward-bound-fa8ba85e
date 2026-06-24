
## Problema

A aba **Operação → CFO** mostra apenas 4 pessoas mapeadas ao DRE Oxy, e ~R$ 47k de lançamentos sem vínculo, porque o algoritmo de match em `useSquadCostFromDre` só tenta 3 estratégias:

1. CPF (11 dígitos no `label`)
2. Raiz de CNPJ (8 dígitos no `label`)
3. Alias manual em `dre_supplier_alias`

Quando o `label` do fornecedor no DRE Oxy é simplesmente o **nome da pessoa** (sem CPF/CNPJ embutido), nada bate — e a tabela `dre_supplier_alias` está atualmente vazia (0 linhas). As 21 pessoas em `cfo_squad_assignment` (8 squads de CFOaaS) ficam invisíveis.

## Solução em duas frentes

### Frente A — Match automático por nome no hook (cobre 80%+ sem trabalho manual)

Adicionar **estratégias 4 e 5** em `src/hooks/useSquadCostFromDre.ts`:

4. **Nome exato normalizado**: comparar `normalize(it.label)` com `normalize(pessoa.Nome)` e `normalize(pessoa.Título)`. Match imediato se igual.
5. **Nome fuzzy por tokens** (apenas contra pessoas que estão em `cfo_squad_assignment`, para evitar falso-positivo com outros funcionários):
   - Tokenizar nome em palavras ≥3 letras (ignorar "de", "da", "do", "dos", "das", "e").
   - Se ≥2 tokens do label baterem com tokens da pessoa **E** for o único candidato com score ≥2, faz match.
   - Empate → não bate (deixa para alias manual).

Para os matches por nome, marcar `confidence: 'name-exact' | 'name-fuzzy' | 'cpf' | 'cnpj' | 'alias'` no `SquadMemberCost.suppliers` para auditoria.

### Frente B — Admin UI: Auto-sugestão com bulk save

Em `src/components/planning/admin/CfoSquadAdminTab.tsx`, na seção "Fornecedores DRE sem vínculo":

1. Botão **"Auto-sugerir vínculos"** que roda o matching fuzzy (mesmo algoritmo da Frente A) sobre a lista de `squad.unmatched` × `allPessoasFinanc`, e pré-preenche `aliasPicks` com a melhor sugestão por label.
2. Cada sugestão pré-preenchida ganha um badge "🟡 Sugestão automática" para o admin revisar antes de salvar.
3. Botão **"Salvar todas as sugestões"** que faz `insert` em batch em `dre_supplier_alias` para todas as sugestões com confiança ≥ 2 tokens.
4. Após salvar, invalida queries — a aba CFO recarrega com os novos vínculos sem reload manual.

### Frente C — Diagnóstico (opcional, recomendado)

Adicionar console.warn no hook listando, no primeiro render com dados, quantos labels foram resolvidos por cada estratégia (cpf/cnpj/alias/name-exact/name-fuzzy) e quais ficaram sem vínculo — facilita debugar quando algum nome muda.

## Arquivos a alterar

```text
src/hooks/useSquadCostFromDre.ts                       (Frente A — estratégias 4+5 + diagnóstico)
src/components/planning/admin/CfoSquadAdminTab.tsx     (Frente B — auto-sugerir + bulk save)
```

Sem alterações em schema, edge functions ou migrations. A tabela `dre_supplier_alias` continua sendo a fonte de verdade para overrides manuais.

## Validação após implementar

1. Abrir Operação → CFO. O indicador deve subir de "4 pessoa(s) mapeada(s)" para perto de 21.
2. "Total CaaS" deve continuar igual, mas "Fornecedor s/ vínculo" cair drasticamente.
3. Cada CFO Squad deve mostrar custo real refletindo CFO + analistas, não fallback hardcoded.
4. Em Admin → Squads CFOaaS, clicar "Auto-sugerir vínculos" deve preencher a maioria dos picks; admin revisa e salva em lote os corretos.

## Observações

- O fuzzy match é **restrito a pessoas em `cfo_squad_assignment`** para não puxar funcionários de outras áreas (RH, comercial) que aparecem no DRE com nome similar.
- A Frente A já entrega o resultado imediato. A Frente B é a ferramenta para tratar os ~20% de casos onde o nome no DRE é uma razão social (ex.: "ABC SERVIÇOS LTDA — Pedro Silva") que o fuzzy não pega sozinho.
