## Objetivo

Tornar cada número da matriz clicável para abrir a lista de cards por trás daquela célula, com link direto para o Pipefy.

## Escopo

1. **Células clicáveis** em `CloserPerformanceMatrix.tsx`:
   - Reuniões, Vendas e "Em elaboração" — por linha (faixa) × coluna (closer), inclusive coluna "Sem Closer" e linha "Equipe/Total".
   - Cursor pointer + hover destacado quando `count > 0`.

2. **Drill-down**: painel lateral (Sheet) dentro do próprio modal listando os cards filtrados. Cada card exibe:
   - Empresa/Nome
   - Faixa de faturamento
   - Closer (ou "Sem Closer")
   - SDR
   - Data
   - Valor (MRR/Setup/Pontual quando aplicável)
   - **Botão "Abrir no Pipefy"** usando `it.id` no padrão `https://app.pipefy.com/open-cards/{id}` (mesmo esquema já usado no dashboard — memória `Deep Linking Config`).

3. **Filtragem interna**: no clique da célula, filtra `reunioes`/`vendas`/`propostas` do próprio `useMemo` por:
   - `normalizeTier(item.revenueRange) === tier` (ou "Total" = sem filtro de faixa)
   - `keyOf(item.closer) === closerKey` (ou "Equipe" = sem filtro de closer)
   - Para elaboração: mesma lógica sobre `propostas` já com `phase.includes("elabora")`.

4. **UX**: título do painel ex.: *"Reuniões · R$ 200k–350k · Bruna (7)"*. Botão de fechar volta pra matriz sem perder o estado.

## Fora de escopo

- Nenhuma mudança em hooks de analytics, agregadores ou acelerômetro.
- Nenhuma mudança em outras telas.

## Validação

Clicar em "18" da linha "Sem Closer" (exemplo) deve abrir a lista com 18 cards, cada um com botão que abre a URL do Pipefy em nova aba.
