## Objetivo

No dashboard G4 (`/dash-g4` e aba G4 nos Indicadores):

1. Lotus, Stillus Home e Tchau Entrega devem ser atribuídos ao **Talk SE de 25/06**, não às lives.
2. Petromar deve sair da live e ir para **Finders Fee**, que passa a ser uma **aba/seção própria**, fora da árvore Live › Palestras › Eventos.

## O que foi verificado

- O evento existe na base como `G4 SCALE EXPERIENCE 25/06/2026` (2 inscritos, 2 vendas hoje).
- Hoje ele cai em **Eventos**: `canonLive()` reescreve o nome para "Evento G4 - 25/06/2026" (não tem token "live"/"aula"), e o matcher `Talks SE` (`/\bse\b/`) nunca encontra o "SE" porque o nome original é descartado.
- Vendas com várias lives já são atribuídas a uma só via `pickClosestLive` — é por isso que Petromar cai na live mais próxima do ganho.
- O bucket `G4 - Finders Fee (fora das lives)` hoje só recebe vendas da whitelist **sem** nenhuma live associada, e é renderizado como um item comum dentro da árvore.

## Mudanças

### 1. Talk SE como Palestra (`canonLive.ts`)
- Reconhecer "scale experience" / "talk se" / "SE" no nome cru: rótulo canônico `Talk SE - 25/06/2026` e classificação `{ categoria: "Palestras", subcategoria: "Talks" }`.
- Manter o matcher `Talks SE` do esqueleto funcionando com o novo rótulo.

### 2. Atribuição manual de vendas (`G4ConsolidatedDashboard.tsx`)
- Novo mapa `G4_SALE_EVENT_OVERRIDE` (por e-mail, com fallback por nome/empresa normalizada para o Stillus, cujo e-mail não está claro na whitelist):
  - Lotus (`administrativo@lotuslogistica.com` / `adm@lotuslogistica.com`), Stillus Home, Tchau Entrega (`tchauentrega@gmail.com`) → `Talk SE - 25/06/2026`.
  - Petromar (`sidney@petromarcomercial.com.br`) → `Finders Fee`.
- O override roda em `buildGroups`, antes de `pickClosestLive`, e substitui todas as lives do lead pelo grupo definido — assim o lead deixa de contar na live original (inscritos, quentes, fechados e valores).

### 3. Finders Fee como seção separada
- Separar o grupo Finders Fee dos grupos da árvore: ele deixa de aparecer dentro de Live/Palestras/Eventos.
- Renderizar um bloco próprio abaixo da tabela de categorias, com as mesmas colunas (inscritos, MQLs, em contato, quentes, fechados, perdidos, MRR, Setup, Pontual, TCV) e o mesmo drill-down clicável.
- Os KPIs do topo continuam somando tudo (lives + palestras + eventos + Finders Fee), com dedupe por lead, como já fazem hoje.

## Detalhes técnicos

- Arquivos: `src/components/planning/g4/canonLive.ts`, `src/components/planning/g4/G4ConsolidatedDashboard.tsx`.
- Nada muda no edge function `g4-metrics` — os valores dos ganhos continuam vindo direto do Pipefy.
- O filtro de data trata o Talk SE pela data 25/06/2026; o Finders Fee continua usando a data de criação do card como fallback.

## Pendência

Preciso confirmar o e-mail/identificação exata do **Stillus Home** (não aparece nomeado na whitelist atual). Se você tiver o e-mail, me passe; senão vou casar por nome/empresa contendo "stillus".
