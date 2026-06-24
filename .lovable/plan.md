## Objetivo

Forçar como **Quente** 16 cards listados na planilha `Quentes junho.xlsx`, independente da tag atual no Pipefy, em cada um dos hooks de analytics relevantes.

## Distribuição dos cards por BU

**Modelo Atual** (`useModeloAtualAnalytics.ts`) — produtos CAAS / Turnaround / Diagnóstico / Oxy / Oxy + BPO:
- Viver, Rede sander, Instituto da Boca, SB Travel, THS Diagnóstico, GSC, Art Rio, Grupo Orthos, FAUHOME, Rodotec, Easy Plan

**Expansão — Franquia** (`useExpansaoAnalytics.ts`, produto = 'Franquia'):
- Eberson, Ranieri

**Expansão — Oxy Hacker** (`useExpansaoAnalytics.ts`, produto = 'Oxy Hacker'):
- Thiago, Márcia, Patrick

## O que mudar

### 1. `src/hooks/useModeloAtualAnalytics.ts`
Adicionar ao `FORCED_QUENTE_TITLES` (set já existente, normalizado: lowercase + sem acento + trim) os 11 títulos de Modelo Atual.

### 2. `src/hooks/useExpansaoAnalytics.ts`
- Criar helper local `normalizeTitleForQuente` (mesma fórmula do Modelo Atual).
- Criar dois sets:
  - `FORCED_QUENTE_FRANQUIA = new Set(['eberson','ranieri'])`
  - `FORCED_QUENTE_OXY_HACKER = new Set(['thiago','marcia','patrick'])`
- No `parseCardRow` (linha ~214), substituir `temperatura: parseTemperatura(row)` por uma checagem que, com base no `produto` já calculado, escolhe o set correspondente e força `'Quente'` se o título normalizado bater. Fallback continua `parseTemperatura(row)`.

### 3. Outbound
Não há cards de outbound na planilha — sem mudança em `useOutboundAnalytics.ts`.

## Detalhes técnicos

- Match por **título normalizado exato** (lowercase + NFD + sem combining marks + trim), conforme padrão já existente.
- Override é incondicional (sem filtro por mês) — segue o mesmo comportamento dos títulos já forçados (`baffs`, `fromtherm`, etc.). O filtro de período do dashboard naturalmente só exibe os cards cuja `dataEntrada` cai dentro da janela selecionada, então quem visualizar junho/2026 verá esses cards como Quentes e quem mudar para outro período não os verá (a menos que o card também tenha `dataEntrada` lá).

## Arquivos afetados

- `src/hooks/useModeloAtualAnalytics.ts` — expandir `FORCED_QUENTE_TITLES`
- `src/hooks/useExpansaoAnalytics.ts` — adicionar normalizer + 2 sets + lógica de override no `parseCardRow`
