## Objetivo

Mesclar valores **por pessoa** (não por squad inteiro): quem já está mapeado pela nova lógica (CPF / CNPJ / alias do DRE Oxy) usa o valor real do DRE; quem ainda não está mapeado mantém o valor hardcoded de `CFO_SQUADS` em `CfoView.tsx`.

Hoje o cache em `CfoView.tsx` faz fallback só quando o **total do squad inteiro = 0**. Então basta um membro ser reconhecido para o squad usar o DRE puro e os outros membros sumirem do custo. É isso que está causando os números errados.

## Mudanças

### 1. `useSquadCostFromDre.ts`
Expor, junto de cada `SquadCost`, o **set de pessoas reconhecidas** (chave normalizada do nome) — o que já existe internamente, só precisa sair no retorno. Também expor um lookup global `matchedByPessoaNome: Map<nomeNormalizado, { fee, benef }>` para o CfoView poder consultar membro a membro sem depender do nome do squad.

Sem mudar a lógica de matching (continua CPF → CNPJ → alias → unmatched).

### 2. `CfoView.tsx` — merge granular

Substituir o cache atual `SQUAD_COST_CACHE: Record<cfoNome, {fee,benef,total}>` por dois caches:

- `SQUAD_REAL_BY_PERSON: Record<nomeNormalizado, {fee, benef}>` — populado pelo hook.
- `CFO_SQUADS` (hardcoded) continua igual.

Reescrever `getSquadCusto / getSquadFee / getSquadBeneficios` assim:

```
para cada squad em CFO_SQUADS[cfoNome]:
  para o CFO e cada membro:
    se SQUAD_REAL_BY_PERSON[normalize(nome)] existe → usa fee/benef do DRE
    senão → usa fee/benef do CFO_SQUADS (hardcoded)
  soma tudo
```

Isso garante que, conforme você vincular aliases no admin, o custo daquela pessoa migra do hardcoded para o DRE real, e os colegas dela continuam com o hardcoded sem zerar.

### 3. `CfoSquadAdminTab.tsx`
Sem mudanças funcionais. Continua mostrando unmatched + dropdown de alias. Opcional: badge "usando hardcoded" ao lado de cada membro de `CFO_SQUADS` que ainda não tem match real (útil pra saber quem falta vincular).

## Arquivos
- `src/hooks/useSquadCostFromDre.ts` — adicionar `matchedByPessoaNome` no retorno.
- `src/components/planning/jornada/CfoView.tsx` — trocar cache e reescrever os 3 helpers `getSquad*`.
- (opcional) `src/components/planning/admin/CfoSquadAdminTab.tsx` — badge informativa.

Nada de migração nova, nada de mexer no DRE.
