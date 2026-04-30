## Objetivo

Ao lado do indicador **"Cliente há X meses"** na visão Jornada (ReunioesView), exibir também a **data de assinatura do contrato** que vem do DB Clientes.

Exemplo:
```
Cliente há 12 meses (desde 08/05/2025)
```

## Onde mudar

**Arquivo:** `src/components/planning/jornada/ReunioesView.tsx`
**Função:** `buildClientSummary` (linhas 100–106)

## Mudança

Trocar:
```ts
if (cliente.lifetimeMonths) {
  lines.push(`Cliente há ${cliente.lifetimeMonths} meses`);
}
```

Por algo como:
```ts
if (cliente.lifetimeMonths) {
  const dataStr = cliente.dataAssinatura
    ? cliente.dataAssinatura.toLocaleDateString('pt-BR')
    : null;
  lines.push(
    `Cliente há ${cliente.lifetimeMonths} meses${dataStr ? ` (desde ${dataStr})` : ''}`
  );
}
```

O campo `dataAssinatura` já existe no tipo `JornadaCliente` e já é populado pelo `useJornadaData` a partir de `pipefy_db_clientes` → não precisa mexer em hook nem em backend.

## Fora de escopo

- Não muda a fonte da data (continua DB Clientes).
- Não cria fallback para Central de Projetos (Norte gas tem a data corretamente no DB Clientes).
- Não altera nenhum outro indicador, cálculo ou visualização.
