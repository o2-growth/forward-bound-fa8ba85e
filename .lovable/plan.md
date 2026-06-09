## Objetivo

Adicionar uma nova seção **logo abaixo dos acelerômetros (monetary gauges)** na aba **Indicadores › Comercial › Modelo Atual** que mostra todos os cards que possuem **tag de temperatura** preenchida no Pipefy (Quente / Morno / Frio / Fria), com drill-down clicável.

Escopo: **somente Modelo Atual**. As demais BUs ficam intocadas.

## De onde vem o dado

O pipe Comercial Modelo Atual (`pipefy_moviment_cfos`) tem hoje **três campos** que carregam a temperatura, todos já sincronizados:

| Coluna no DB        | Formato                       | Exemplo               |
| ------------------- | ----------------------------- | --------------------- |
| `Prioridade Lead`   | JSON array string             | `["Quente"]`          |
| `Prioridade do Lead`| JSON array string (legado)    | `["Quente"]`          |
| `Labels`            | Texto plano (Pipefy native)   | `Quente`              |

A função de leitura vai consolidar os três campos em **um único valor normalizado** (`Quente` / `Morno` / `Frio`) — tratando `Fria → Frio` e `Morna → Morno` para padronizar.

Cobertura atual no DB: ~30 cards taggeados. A view fica naturalmente mais útil conforme o time comercial passa a etiquetar mais.

## O que será construído

### 1. Parser (`src/hooks/useModeloAtualAnalytics.ts`)
- Adicionar campo `temperatura?: 'Quente' | 'Morno' | 'Frio'` em `ModeloAtualCard`.
- Helper `parseTemperatura(row)` que:
  - lê `Labels` → se vazio, tenta `Prioridade Lead` → fallback `Prioridade do Lead`;
  - faz `JSON.parse` quando o valor começa com `[`;
  - normaliza acentos/case e mapeia: `quente→Quente`, `morn*→Morno`, `fri*→Frio`;
  - ignora valores fora dessa lista.
- Expor `getCardsByTemperatura()` que devolve `{ Quente, Morno, Frio }` com a lista de cards do período cuja `temperatura` está preenchida (sem dedup adicional — 1 entrada por card).

### 2. Componente novo `TemperaturaSection`
`src/components/planning/indicators/TemperaturaSection.tsx`

Estrutura:

```text
┌──────────────────────────────────────────────────────────────┐
│ 🌡 Temperatura dos Leads · Modelo Atual                     │
├──────────────────────────────────────────────────────────────┤
│ [🔥 Quente · 18]   [🌤 Morno · 6]   [❄ Frio · 9]            │
│  (chip clicável)   (chip clicável)  (chip clicável)          │
│                                                              │
│  Total taggeado: 33 · Sem tag: 412                           │
└──────────────────────────────────────────────────────────────┘
```

- Cada chip abre o `DetailSheet` já existente (mesmo padrão dos drill-downs de funil), listando os cards com:
  empresa, fase atual, closer, SDR, MRR, data de entrada, link Pipefy.
- Sem mudança nas metas; é puramente informativo.

### 3. Integração no layout
Editar o tab "Modelo Atual" dentro de `src/components/planning/indicators/` (componente que monta os acelerômetros — provavelmente `ModeloAtualSection.tsx` ou similar dentro de `indicators/`).

Inserir `<TemperaturaSection />` **imediatamente após o bloco dos acelerômetros monetários** e antes do funil.

A seção fica oculta automaticamente quando nenhum card no período tem tag (evita um card vazio).

## Filtros que respeita
- Período (mês/ano) já selecionado no dashboard.
- Filtro de SDR e Closer (quando ativos) — usa os mesmos predicados que o resto do Modelo Atual.

## Fora de escopo
- Outras BUs (O2 TAX, Expansão, Outbound) — Modelo Atual only.
- Edição da tag a partir do dashboard.
- Mudança no pipeline de sync externo (n8n) — o dado já chega.

## Arquivos afetados
- `src/hooks/useModeloAtualAnalytics.ts` — parser + getter.
- `src/components/planning/indicators/TemperaturaSection.tsx` — novo.
- `src/components/planning/indicators/<arquivo do tab Modelo Atual>.tsx` — render da seção.
- Memória nova: `mem://features/indicators/modelo-atual-temperatura-section`.

## Validação
1. Abrir Indicadores › Comercial › Modelo Atual em um mês com cards taggeados.
2. Conferir contagem dos chips contra query SQL:
   `SELECT Labels/Prioridade Lead, count(distinct ID) FROM pipefy_moviment_cfos WHERE Entrada BETWEEN ...`
3. Clicar em cada chip → DetailSheet abre com a lista correta.
4. Em mês sem tags, a seção não aparece.
