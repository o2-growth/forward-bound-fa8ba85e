# Bug: Data de churn aparece 1 dia a menos que no Pipefy

## Causa raiz

No card Bracci Metais, o Pipefy mostra **05/05/2026** mas no dossiê aparece **04/05/2026**.

A função `toLocalDateBR` em `src/hooks/useOperationsData.ts` (linhas 10-23) recebe a string ISO vinda do sync do Pipefy (ex.: `"2026-05-05T00:00:00.000Z"` — meia-noite **UTC**) e formata via `Intl.DateTimeFormat` no fuso `America/Sao_Paulo` (UTC-3). O resultado é `2026-05-04 21:00` → formatado como **`"2026-05-04"`**.

Esse shift afeta **todos** os campos de data-only do dossiê que passam por `toLocalDateBR`:
- `Finalizacao contrato ultimo dia` (da Tratativa)
- `Data do churn` (Central de Projetos)

Daí `dataEncerramento` e `mesChurn` saem um dia antes (e em casos de virada de mês, no mês anterior).

Bracci passa despercebido pelo `parsePipefyDateOnly` (swap DD↔MM) porque day=5 e month=5 — o swap não muda nada — mas o shift de timezone continua acontecendo no `toLocalDateBR`.

## Correção

Em `src/hooks/useOperationsData.ts`, ajustar `toLocalDateBR` para detectar **strings ISO date-only (meia-noite UTC)** e devolver a parte `YYYY-MM-DD` direto, **sem** conversão de timezone — exatamente como `parseRotinaDateOnly` já faz para esse caso.

Lógica nova:

```ts
function toLocalDateBR(input) {
  if (!input) return '';
  if (typeof input === 'string') {
    // Já no formato YYYY-MM-DD → retorna direto
    const ymd = input.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (ymd) return ymd[1];
    // ISO date-only à meia-noite UTC (Pipefy sync) → usar a parte da data direto
    const isoMidnight = input.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.\d+)?Z?$/);
    if (isoMidnight) return isoMidnight[1];
  }
  // Demais casos (Date real ou ISO com timestamp) → formatar no fuso BR
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}
```

## Impacto

- Bracci Metais passa a aparecer corretamente como churn em **05/05/2026**.
- Qualquer outro churn cuja "Finalizacao contrato ultimo dia" ou "Data do churn" estivesse sendo exibida 1 dia antes é corrigido.
- Cards cuja data caía no dia 1 do mês (e por isso eram atribuídos ao mês anterior) voltam ao mês correto, ajustando também o `mesChurn`.
- Não altera datas que já vinham como `YYYY-MM-DD` puro nem datas com timestamp real.

## Arquivo alterado

- `src/hooks/useOperationsData.ts` — apenas a função `toLocalDateBR`.
