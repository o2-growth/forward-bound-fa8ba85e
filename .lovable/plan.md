## Aba de diagnóstico "G4 Lives — Conferência" (oculta, sem afetar nada)

Criar uma **nova aba isolada** para comparar os valores oficiais das Lives × dados do Pipefy, sem tocar em nada da UI atual.

### Onde
- Nova rota: `/debug/g4-lives-check` (não linkada em nenhum menu — só acessível digitando a URL).
- Novo componente: `src/pages/DebugG4LivesCheck.tsx`.
- Registro apenas em `src/App.tsx` (rota nova, protegida por role admin — se não for admin, redireciona pra `/`).
- **Zero mudança** em `LivesSection.tsx`, `livesOfficial.ts`, `g4Events.ts`, `g4Funnel.ts` ou qualquer hook.

### O que a página mostra
Reaproveita `useModeloAtualAnalytics` (mesmos cards já usados hoje) + as constantes `G4_LIVES` e `LIVES_OFICIAIS`.

Para cada live em `G4_LIVES`:

1. **Cabeçalho**: label + data + janela de captura.
2. **Tabela Oficial × Pipefy**:

   ```text
   Métrica         | Oficial | Pipefy | Δ
   Inscritos       |   339   |   ?    |  ?
   Entraram        |    52   |   ?    |  ?
   Levantaram mão  |     3   |   ?    |  ?
   Venda           |     1   |   ?    |  ?
   ```

   - `Oficial` = `LIVES_OFICIAIS[live.date]`
   - `Pipefy` = `computeCounts(cardsForLive(liveCards, live.date, live.captureWindowDays))`
   - `Δ` colorido (verde=0, vermelho≠0)

3. **Lista de cards atribuídos** (colapsável): id, título, `Origem do lead`, `Campanha`, `Fonte`, `Data Criação`, fase atual — os cards que a lógica `isCardLive` + janela de captura atribuiu àquela live. É aqui que dá pra ver *"o Pipefy tem esse lead ou não?"*.

### Fora do escopo
- Não altero nenhuma lógica de negócio nem números exibidos em outras telas.
- Não crio link/menu visível — página existe só via URL direta.
- Não altero `livesOfficial.ts`; qualquer correção nos números oficiais vem depois, com base no que a conferência mostrar.
