## Objetivo

Adicionar um card próprio "Por Closer" na aba Indicadores → Comercial, fora do `WeeklyComparison`, com o mesmo visual/comportamento do bloco "Por SDR" existente. Mostra contagem de RM, RR, Proposta e Venda por closer, respeitando os filtros globais já ativos (Data, BUs, SDR e Closer).

## Onde vai aparecer

Logo abaixo do bloco "Por SDR" atual (que está embutido em `WeeklyComparison`), porém renderizado **diretamente em `IndicatorsTab.tsx`** como card próprio (`<Card>` shadcn) com header destacado, igual ao padrão dos outros cards da página. Sempre visível quando houver dados — não embutido em collapsible.

## Conteúdo do card

Duas tabelas, exatamente como o "Por SDR" hoje:

1. **Por Closer (período completo)** — uma linha por closer, colunas: RM | RR | Proposta | Venda + linha de Total. Ordenado pelo maior valor de RM (ou primeira coluna disponível).
2. **Por Closer (semana a semana)** — toggle de indicador (RM/RR/Prop/Venda); linhas = closers, colunas = semanas dentro do range. Mesma estética da versão SDR.

Sem metas, sem ticket, sem conversão. Apenas contagem.

## Respeito aos filtros

O card vai consumir o **mesmo dataset já filtrado** que o `WeeklyComparison` recebe (`allItemsByIndicator` agregado por `IndicatorsTab`), garantindo automaticamente que:

- **Data:** intervalo `startDate`/`endDate` do filtro de período.
- **BU:** o agregador em `IndicatorsTab` (linhas ~870–1000) só inclui cards das BUs ativas, então closers que só atuam em BUs desligadas somem da tabela.
- **SDR:** se o usuário filtrar por SDR, o dataset já vem reduzido (linhas ~919–1003 aplicam `matchesSdrFilter`), o que naturalmente reduz também os closers que aparecerem.
- **Closer:** se houver filtro de Closer ativo (`effectiveSelectedClosers`), o agregador já filtra por `matchesCloserFilter` antes de chegar no card — então a tabela só listará closers selecionados.

Agrupamento de nomes: usa `(item.closer || '').trim()` lowercase como chave (mesma função `getCloserName` já existente no `WeeklyComparison`). Cards sem closer caem em "Sem Closer".

## Implementação técnica

1. **Extrair as funções `SdrBreakdown` e `SdrBreakdownWeekly`** de `WeeklyComparison.tsx` para um novo arquivo `src/components/planning/indicators/PersonBreakdown.tsx`, exportando:
   - `PersonBreakdown` (período completo)
   - `PersonBreakdownWeekly` (semanal)
   - Tipos `PersonRole = 'sdr' | 'closer'`
   - Helpers `getSdrName`, `getCloserName`, `getPersonName`, `aggregatePersonCounts`, `getWeeksInRange`

   Isso elimina duplicação e mantém o "Por SDR/Closer" interno do `WeeklyComparison` funcionando importando do novo módulo.

2. **Adicionar em `IndicatorsTab.tsx`**, dentro do JSX da seção Comercial, logo após o `<WeeklyComparison ... />`, um novo `<Card>`:

   ```tsx
   <Card>
     <CardHeader>
       <CardTitle>Comparativo por Closer</CardTitle>
       <CardDescription>RM, RR, Proposta e Venda por closer no período/BUs selecionados.</CardDescription>
     </CardHeader>
     <CardContent className="space-y-4">
       <PersonBreakdown role="closer" itemsByIndicator={allItemsByIndicator} startDate={...} endDate={...} indicatorConfigs={...} />
       <PersonBreakdownWeekly role="closer" weeks={weeks} itemsByIndicator={allItemsByIndicator} indicatorConfigs={...} />
     </CardContent>
   </Card>
   ```

   Reaproveita exatamente os mesmos `startDate`, `endDate`, `allItemsByIndicator` e `indicatorConfigs` já passados ao `WeeklyComparison`.

3. **Remover** as duas chamadas `role="closer"` que hoje estão dentro do `WeeklyComparison` (linhas 549–563) para não duplicar a informação. O bloco SDR continua lá dentro.

4. **Tokens de design:** todos os elementos usam classes semânticas já presentes nos breakdowns (`bg-muted/40`, `border`, `text-muted-foreground`, cores de indicador via `INDICATOR_COLORS` já mapeadas).

## Fora de escopo

- Não cria tabela `closer_rm_rr_metas` nem comparativo vs meta.
- Não muda lógica de atribuição de closer nos cards.
- Não toca em `useCloserMetas` (que é só rateio %).
- Não mexe nos gauges monetários (esses já têm closer filter via memory `monetary-gauges-closer-filter`).

## Validação após implementar

- Selecionar uma BU única e verificar que só closers daquela BU aparecem.
- Mudar range de data: linhas e totais devem atualizar.
- Aplicar filtro de Closer no topo: tabela deve listar apenas os selecionados.
- Aplicar filtro de SDR: contagens devem cair (apenas cards desses SDRs entram).
- Conferir que totais batem com os gauges agregados de RM/RR/Prop/Venda da página.
