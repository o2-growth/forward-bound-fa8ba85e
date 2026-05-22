## Causa raiz

A coluna `Cliente Participou` (campo legado) está marcada na nova estrutura como **SEMPRE NULL** — Pipefy migrou para colunas separadas por reunião. Como o frontend ainda lê primariamente `Cliente Participou`, os campos `p1` e `clienteParticipou` chegam como `null`, e o status cai em "Preenchida (só preench.)" mesmo quando o cliente confirmou.

## Mapeamento correto (conforme schema enviado)

| Campo UI | Coluna nova no banco | Legado (manter como último fallback) |
|---|---|---|
| p1 (R1 participou) | `cliente` | `Cliente Participou` |
| p2 (R2 participou) | `participou2` | — |
| p3 (R3 participou) | `participou3` | — |
| p4 (Mensal participou) | `participoum` | — |
| motivo1 | `motivo` | — |
| motivo2 | `motivo2` | — |
| motivo3 | `motivo_3` | — |
| motivoMensal | `motivom` | — |
| ata1 | `ata1` | — |
| ata2 | `ata2` | — |
| ata3 | `ata3` | — |
| ata4 (mensal) | `atam` | — |
| linka1/linkt1 | `linka1` / `linkt1` | — |
| linka2/linkt2 | `linka2` / `linkt2` | — |
| linka3/linkt3 | `linka3` / `linkt3` | — |
| linkaM/linktM/linkgM | `linkam` / `linktm` / `linkgm` | — |
| interno1/2/3/M | `interno1` / `interno2` / `interno3` / `internom` | — |

Observação: o campo `clienteParticipou` (linha 750) é hoje só usado para R1 na coluna "Participou" da tabela — deve apontar para `cliente` (com fallback no legado).

## Alterações

### 1. `src/hooks/useJornadaData.ts`

**Linhas 750 e 761-764** — substituir mapeamento de participação:
```ts
clienteParticipou: row['cliente'] || row['Cliente Participou'] || null,
...
p1: row['cliente'] || row['Cliente Participou'] || null,
p2: row['participou2'] || null,
p3: row['participou3'] || null,
p4: row['participoum'] || null,
```

**Linhas 765-768** — corrigir atas para os nomes reais:
```ts
ata1: row['ata1'] || null,
ata2: row['ata2'] || null,
ata3: row['ata3'] || null,
ata4: row['atam'] || null,
```

### 2. `src/components/planning/jornada/ReunioesView.tsx`

**Linhas 354-360 e 441-442** (painel de ajuda / tooltip "Fonte") — atualizar texto para refletir os novos nomes de coluna (`cliente`, `participou2`, `participou3`, `participoum`) em vez de `Cliente Participou`/`participou2/3/m`.

Sem mudança de lógica de status — `getReunionStatus` já aceita `Sim/sim/yes` e `Não/nao/no`, que é exatamente o que o Pipefy envia nas novas colunas (confirmado nos exemplos: "Sim"/"Não").

## Validação após o build

1. Abrir a aba Reuniões e verificar que linhas com R1 preenchida + cliente "Sim" agora aparecem 🟢 **Feita** (e não mais 🔵 "só preench.").
2. Conferir um card com R2/R3 preenchidos e cliente "Não" — deve aparecer 🔴.
3. Coluna "Participou" da última reunião (R1) deve mostrar ✓/✗ corretamente.

## Fora de escopo

Não vou mexer em telas, regras de health score, agregados por CFO, nem outros campos de rotinas — apenas o mapeamento de participação/motivo/ata/links das reuniões R1–R4 conforme pedido.
