## Problema

Na aba Jornada → Reuniões, as datas das colunas R1, R2, R3 e Comitê aparecem com **dia e mês trocados**:

| Cliente              | Aparece    | Provável correto |
|----------------------|------------|------------------|
| Etel                 | 04/Ago     | 08/Abr           |
| Mineração Rio Piranema | 04/Jul   | 07/Abr           |
| Babyland              | 04/Fev    | 02/Abr           |
| Construtora Izza Caetano | 04/Jan | 01/Abr           |
| FilmStar              | 04/Fev    | 02/Abr           |

Datas com dia > 12 (ex.: `17/Abr`, `14/Abr`, `16/Abr`, `15/Abr`) aparecem corretas — confirma que o problema é exatamente o swap DD↔MM quando o "dia" cabe num mês válido (1–12).

## Causa

`useJornadaData.ts` está lendo as datas das reuniões e do prazo previsto com `parsePipefyDateOnly` (linhas 228, 261-264, 608-613). Essa função foi criada para compensar um sync legacy que invertia DD↔MM antes de salvar no banco — então ela "desinverte" trocando dia e mês quando o dia ≤ 12.

Acontece que a tabela `pipefy_moviment_rotinas` é alimentada pelo sync atual do Pipefy, **que já salva no formato correto** (mesma situação que confirmamos para `pipefy_db_clientes` no fix anterior do Norte Gas). Como o `parsePipefyDateOnly` ainda aplica o swap, datas corretas viram inversões erradas.

Outros hooks que usam `parsePipefyDateOnly` (Modelo Atual, Expansão, OxyHacker) leem outras tabelas com sync diferente que ainda têm o problema legacy — não devem ser alterados.

## Correção

**Arquivo:** `src/hooks/useJornadaData.ts`

Substituir as 6 chamadas de `parsePipefyDateOnly` por `parsePipefyDate` (parser direto, sem swap) nos seguintes pontos:

- Linha 228 — `Data Prevista Entrega` (cálculo de tarefas atrasadas)
- Linha 261 — `Data Reuniao 1`
- Linha 262 — `Data Reuniao 2`
- Linha 263 — `Data Reuniao 3`
- Linha 264 — `Data Mensal` (R4 / Comitê)
- Linhas 608-613 — mesmos campos no objeto `reunioes` retornado para `ReunioesView`

A linha 103 (`Data de assinatura do contrato` em `pipefy_db_clientes`) **permanece com `parsePipefyDateOnly`**, conforme o fix do Norte Gas já aprovado. Vamos confirmar que esse caminho continua funcionando — se necessário, também trocar para `parsePipefyDate` (mesma origem de sync, mesmo comportamento esperado).

`parsePipefyDate` já está importado no topo do arquivo (linha 5), portanto não há mudança de imports.

## Detalhes técnicos

`parsePipefyDate` (em `src/hooks/dateUtils.ts`) trata:
- DD/MM/YYYY string → parse direto no fuso local, meio-dia (sem timezone shift)
- ISO `YYYY-MM-DDTHH:mm:ss.sssZ` → `new Date(s)` (preserva hora UTC). Para campos date-only à meia-noite UTC isso pode causar shift para dia anterior em UTC-3, mas a função `getReunionStatus` usa `data.getDate()` no fuso local → o dia exibido fica deslocado.

Para evitar esse shift, melhor estratégia: **inline um parser ISO sem swap** dentro do `useJornadaData.ts` (ou criar uma helper `parseRotinaDateOnly` no `dateUtils.ts`) que:
1. Se string casa com `YYYY-MM-DD...`, monte `new Date(year, month-1, day, 12, 0, 0)` (meio-dia local) — sem swap.
2. Se string casa com `DD/MM/YYYY`, parse direto (mesma lógica do `parsePipefyDate`).
3. Caso contrário, retorna null.

Recomendação: criar `parseRotinaDateOnly` em `dateUtils.ts` e usar nas 6 chamadas. Mantém `parsePipefyDateOnly` intocado.

## Resultado esperado

Após o fix:
- Etel: `08/Abr` (não `04/Ago`)
- Mineração Rio Piranema: `07/Abr`
- Babyland: `02/Abr` em vez de `04/Fev`
- Construtora Izza Caetano: `01/Abr`
- Datas com dia > 12 continuam iguais (já estavam corretas)
- Cálculo de "atrasadas" de tarefas usa data correta

## Fora de escopo

- Não tocar em `parsePipefyDateOnly` (afeta outros hooks).
- Não mexer em `ReunioesView.tsx`.
- Não alterar backend nem o sync.
- Linha 103 (`Data de assinatura do contrato`) continua como está, já validada com Norte Gas.
