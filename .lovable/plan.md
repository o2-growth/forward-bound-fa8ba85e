## Objetivo

Expandir a sub-aba **Typeform** com mais métricas, incluindo **reuniões agendadas por dia** (histórico e futuro), e tornar os principais blocos **clicáveis** abrindo drawer com detalhamento.

## Novas métricas / blocos

1. **Reuniões agendadas por dia** (novo gráfico de barras, full-width acima dos demais)
   - Fonte: `v_o2_diag_pipeline` (já traz `booking_date` × `reunioes`, futuras). Para histórico completo, vou também buscar via `?select=*&order=booking_date.asc` sem filtro de data — se a view só retornar futuras, adiciono fallback exibindo apenas o que vier.
   - Eixo X: data (dia/mês), Eixo Y: nº de reuniões. Linha vertical marcando "hoje".

2. **Janela temporal** (4 mini-KPIs em linha) — `v_o2_diag_kpis_temporal`
   - Cards: Hoje · Últimos 7d · Últimos 30d · Mais antigo
   - Cada card: total, MQLs, agendados, % conv MQL

3. **Caminhos A/B/C/D** (tabela) — `v_o2_diag_by_caminho`
   - Colunas: caminho, total, MQLs, completos, agendados, % agenda

4. **Funil por UF** (tabela) — `v_o2_diag_by_uf`
   - Colunas: UF, MQLs, agendados, % conv

5. **Funil por utm_source** (tabela) — `v_o2_diag_by_source`
   - Colunas: source, MQLs, agendados, % conv

6. **Card de velocidade expandido** — `v_o2_diag_velocidade`
   - Já existe; adicionar 2 KPIs irmãos: % sub-10 min e % sub-1h (calculado a partir de sub_10min/total_bookings, sub_1h/total_bookings).

## Interatividade (clicáveis)

Criar um `TypeformDetailDrawer` (usa `Sheet` do shadcn) que abre ao clicar em:

- **KPI "Leads únicos / MQLs / Agendados / Conv MQL"** → mostra a janela temporal completa (`v_o2_diag_kpis_temporal`) + breakdown por SDR e por source para aquela métrica.
- **Linha do gráfico SDR** → drawer com os MQLs daquele SDR, mostrando funil completos→agendados e velocidade (se disponível por SDR via mesma view).
- **Barra do gráfico "Reuniões por dia"** → drawer listando a quantidade e, se a API expuser, datas/SDRs daquele dia (v1 mostra resumo do dia + link para `v_o2_diag_pipeline` filtrado).
- **Linha das tabelas (faturamento, setor, caminho, UF, source)** → drawer com os KPIs filtrados (texto resumido + barras de proporção). Como as views já vêm agregadas, o drawer mostra os campos brutos da linha de forma mais rica, sem nova requisição.

Todas as áreas clicáveis ganham `cursor-pointer`, `hover:bg-muted/40` e role/aria adequados.

## Novo layout

```
Linha 0: 4 cards Janela Temporal (hoje / 7d / 30d / antigo)
Linha 1: 4 KPI cards atuais (clicáveis)
Linha 2: Reuniões agendadas por dia (gráfico full-width, barras clicáveis)
Linha 3: SDR bar chart (clicável) | Reuniões futuras (linha do tempo)
Linha 4: Funil por faturamento | Funil por setor   (linhas clicáveis)
Linha 5: Funil por caminho     | Funil por UF      (linhas clicáveis)
Linha 6: Funil por source (full-width, top 15)     (linhas clicáveis)
Linha 7: Velocidade mediana | % sub-10min | % sub-1h | Cobertura SDR
```

## Arquivos

Novos:
- `src/components/planning/typeform/TemporalKpisRow.tsx`
- `src/components/planning/typeform/BookingsByDayChart.tsx`
- `src/components/planning/typeform/TypeformDetailDrawer.tsx`

Atualizações:
- `useTypeformData.ts` — adicionar hooks `useDiagTemporal`, `useDiagByCaminho`, `useDiagByUf`, `useDiagBySource` e tipos correspondentes.
- `TypeformDashboard.tsx` — montar novo layout, conectar handlers de clique no drawer.
- `FunnelTable.tsx` — aceitar prop `onRowClick?: (row) => void` e aplicar estilos hover/cursor quando presente.
- `SdrBarChart.tsx` — aceitar `onBarClick?: (row) => void` via `onClick` do Recharts.
- `KpiBig.tsx` — aceitar `onClick?` opcional com hover.

## Fora do escopo

- Filtros globais (período/SDR) — vistas já vêm agregadas; manter v1 sem filtros.
- Refresh manual / botão de atualizar.
- Persistência de seleção no URL.
