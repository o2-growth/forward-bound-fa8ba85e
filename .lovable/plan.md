
## Objetivo

Corrigir o classificador de origem (`src/lib/leadSource.ts`) para parar de mandar leads inbound/indicação pro bucket Outbound. Nenhuma alteração em pipes, fases ou estrutura no Pipefy — só lógica de classificação no frontend.

## Mudanças

### 1. `src/lib/leadSource.ts` — nova ordem de prioridade

Primeiro match ganha:

1. **EVENTO** — `tipoOrigem`/`origemLead`/`campanha` contém `evento`, `talkshow`, `summit`, `g4`, `4am`.
2. **OUTBOUND** — apenas 2 gatilhos:
   - `tipoOrigem` contém `prospecção`/`ativa`/`outbound`, OU
   - `tipoOrigem === "Prospecção Ativa"` (marca que `useOutboundAnalytics` já injeta nos cards do pipe Outbound).
   - **Remover** o override "SDR Matheus → outbound". O pipe CFO Modelo Atual deixa de forçar Matheus como outbound; só o pipe Outbound (via marca explícita) classifica como outbound.
3. **INDICAÇÃO**:
   - `tipoOrigem`/`origemLead` com `indicacao`, `cross-sell`, `ex cliente`, `lead captado pelo`, `cliente`, `colaborador`; OU
   - `origemLead` parece nome de empresa (sufixos atuais do `COMPANY_TOKENS`); OU
   - `origemLead` é uma palavra só (marca/empresa); OU
   - **NOVO**: `origemLead` é nome de pessoa (2-4 palavras, sem token de canal, sem sufixo empresa) e **não há nenhum sinal de inbound** (`fonte`/`campanha` vazios e `tipoOrigem` vazio ou genérico). Pessoa solta = indicação, não outbound.
4. **INBOUND** — regras atuais (tipo `site`/`redes sociais`, origem `whatsapp`/`meta ads`/`google`/etc., `fonte` ig*/fb*/google/..., `campanha` `conversao*`/`NX_*`/ID numérico longo/`inbound`).
5. **SEM_ORIGEM** — fallback.

### 2. Manter intocado

- `src/hooks/useOutboundAnalytics.ts` — continua marcando `tipoOrigem = "Prospecção Ativa"` nos cards do pipe Outbound. Esses cards entram pela regra 2 acima.
- Pipefy: nenhuma alteração de pipe, fase, campo ou automação.
- Demais hooks (`useModeloAtualAnalytics`, `useO2TaxAnalytics`, `useExpansaoAnalytics`) — sem mudança; o classificador é puro e roda no frontend.

### 3. Comentários e docstring

Atualizar o cabeçalho do arquivo explicando a nova regra de ouro: **outbound = prospecção ativa explícita OU vindo do pipe Outbound**. Remover menção ao SDR-override.

## Impacto esperado (sobre amostra de 11.722 cards 2025+)

| Bucket      | Antes  | Depois (estimado) |
|-------------|--------|-------------------|
| inbound     | 9.487  | ~9.512            |
| evento      | 1.144  | 1.144             |
| sem_origem  | 944    | 944               |
| outbound    | 82     | ~2 (só prospecção ativa real + pipe Outbound) |
| indicacao   | 65     | ~120 (parceiros + nomes de pessoa)            |

## Validação após implementação

1. Build passa.
2. Abrir `/debug-origens` e `/debug-outbound` para conferir nova distribuição visualmente.
3. Conferir aba Marketing → cards de atribuição (Inbound/Outbound/Indicação/Evento) com período cobrindo 2025+ — Outbound deve cair pra ~2-5 cards e refletir só prospecção ativa real.
