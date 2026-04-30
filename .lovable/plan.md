## Problema

Na visão Reuniões, o card "Norte gas" mostra:

```
Cliente há 12 meses (desde 07/05/2025)
```

Mas no banco (`pipefy_db_clientes`), o valor é `2025-05-08T00:00:00.000Z` — ou seja, **08/05/2025**.

## Causa

A data vem do banco como ISO em UTC à meia-noite (`...T00:00:00.000Z`). O parser usado em `src/hooks/useJornadaData.ts` (`parseDate` → `parsePipefyDate`) trata esse caso com `new Date(s)`, que produz um instante UTC. Quando o `ReunioesView` formata com `toLocaleDateString('pt-BR')`, o navegador converte UTC → America/Sao_Paulo (UTC-3), e 08/05 00:00 UTC vira **07/05 21:00**, exibindo `07/05/2025`.

Já existe no projeto a função `parsePipefyDateOnly` (em `src/hooks/dateUtils.ts`) feita exatamente para campos date-only do Pipefy — ela monta a data no fuso local em meio-dia, evitando esse deslocamento. Outros hooks (Modelo Atual, Expansão, OxyHacker) já usam `parseDateOnly` para `Data de assinatura do contrato`. Só o `useJornadaData` ficou usando o parser genérico.

## Correção

**Arquivo:** `src/hooks/useJornadaData.ts` (linha 103)

Trocar:
```ts
const dt = parseDate(c['Data de assinatura do contrato'] || c['Data assinatura']);
```
Por:
```ts
const dt = parsePipefyDateOnly(c['Data de assinatura do contrato'] || c['Data assinatura']);
```

`parsePipefyDateOnly` já está importado no topo do arquivo (linha 5), então não há mudança de imports.

## Resultado esperado

`Norte gas` passa a exibir:
```
Cliente há 12 meses (desde 08/05/2025)
```

E o `lifetimeMonths` continua igual (a diferença de algumas horas não muda a contagem de meses).

## Fora de escopo

- Não alterar `parsePipefyDate` em si (é usado por dezenas de outros campos).
- Não mexer no `ReunioesView.tsx`.
- Não mexer em backend nem em outros hooks.
