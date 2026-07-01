# Plano

## 1. Mover aba "G4" para dentro de Indicadores

**Hoje:** `G4Tab` é uma aba top-level em `src/pages/Planning2026.tsx` (chave `g4`, ícone Trophy).
**Objetivo:** virar sub-aba dentro de `IndicatorsWrapper` (junto com Comercial, Marketing, Visão CEO, Pessoas).

Alterações:
- `src/components/planning/IndicatorsWrapper.tsx`
  - Adicionar 5ª `TabsTrigger` "G4" (ícone Trophy) e respectivo `TabsContent` renderizando `<G4Tab />`.
  - Ajustar grid da `TabsList` de `grid-cols-4` para `grid-cols-5` e aumentar `max-w-2xl` → `max-w-3xl`.
- `src/pages/Planning2026.tsx`
  - Remover import de `G4Tab`, remover entrada `{ key: 'g4', ... }` do array de abas e o `TabsContent value="g4"`.
  - Manter permissões: quem já tinha acesso a "Indicadores" continua vendo G4 como sub-aba; se alguém tinha permissão específica só de `g4` na tabela `user_tab_permissions`, mapear leitura para conceder acesso a Indicadores (verificar antes de aplicar — se ninguém tiver só `g4`, apenas remover a chave).

## 2. Projeção de caixa ignorar cards em desistência/arquivado/perdido

**Hoje:** `src/components/planning/indicators/temperaturaAggregator.ts` já exclui fases "Perdido" e ganhas, mas o set `LOST_PHASES` cobre só `perdido, perda, lost, descartado`. Cards com fase "Desistência", "Arquivado", "Cancelado", "Desqualificado" continuam entrando no Cenário de Caixa (Realista/Otimista) porque a projeção deriva desse mesmo aggregator.

Alteração:
- `src/components/planning/indicators/temperaturaAggregator.ts`
  - Expandir `LOST_PHASES` para incluir formas normalizadas de: `desistencia`, `desistiu`, `arquivado`, `cancelado`, `cancelamento`, `desqualificado`, `nao qualificado`, `no show`, `sem interesse`.
  - Adicionar guarda extra em Monetização: além de `card.perdido/ganho`, também pular quando `card.arquivado` for verdadeiro (se o campo existir no analytics; senão, apenas normalizar `faseAtual`).
  - Como `CenarioCaixaSection` consome `buckets.Quente/Morno/Frio` do aggregator, a exclusão propaga automaticamente para Realista (Quente+Morno) e Otimista (Quente+Morno+Frio) sem tocar no `CenarioCaixaSection.tsx`.

## Validação
- Typecheck (`tsgo`).
- Playwright: abrir `/`, ir em Indicadores → confirmar sub-aba G4 e sub-aba Comercial → seção "Cenário de Caixa" com contagem menor (e listar por drill-down para confirmar ausência de cards perdidos/arquivados).

## Detalhes técnicos
- Nenhuma mudança em hooks/analytics; só o set de fases e a estrutura de tabs.
- Sem migrations, sem novas dependências.
