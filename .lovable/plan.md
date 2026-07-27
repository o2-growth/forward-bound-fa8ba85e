# Garantir 100% de precisão nos valores do Dash G4

## Objetivo
Eliminar qualquer possibilidade de duplicação ou perda de valor (MRR, Setup, Pontual, TCV) no dashboard G4 e comprovar, com reconciliação automática, que o que aparece na tela é exatamente o que está no Pipefy.

## Riscos identificados na leitura do código atual

1. **Chave de deduplicação frágil.** Em `computeGroup`, `aggFromGroups` e `totals` (`G4ConsolidatedDashboard.tsx`) a chave é `email || nome` em minúsculas. Dois problemas reais: leads sem e-mail e com nomes iguais são fundidos (perde venda), e o mesmo card com e-mails diferentes (pai/filho, e-mail corrigido) conta duas vezes. O `cardId` existe no payload e não é usado como chave primária.
2. **Finders Fee em duas contagens.** O grupo `FINDERS_FEE_LABEL` é exibido em seção separada, mas continua dentro de `groups`, que alimenta os KPIs de topo. Precisa ficar explícito e verificado se o total do topo é "árvore + finders" (correto) ou se algum bloco soma finders duas vezes.
3. **Atribuição de venda a múltiplas lives.** `pickClosestLive` já reduz para uma live, mas só quando há `dataGanho`. Sem `dataGanho` a venda pode cair em mais de um grupo e inflar somas por categoria.
4. **Somatório de campos monetários do Pipefy.** `canonicalLabelKey` deduplica rótulos espelhados mantendo o maior valor, mas depende de regex (`MRR_LABEL_RE`, `SETUP_LABEL_RE`, `IGNORE_LABEL_RE`). Rótulos novos ou fora do padrão podem ser somados em dobro ou ignorados silenciosamente.

## Plano de execução

### Etapa 1 — Auditoria com evidência (antes de qualquer alteração)
- Rodar a edge function `g4-metrics` e extrair, para cada lead em Ganho: `cardId`, e-mail, empresa, MRR, Setup, Pontual, TCV, lives atribuídas e `valoresFonte`.
- Buscar os mesmos cards direto no Pipefy e listar **todos** os campos monetários brutos com rótulo e valor.
- Gerar uma tabela de reconciliação lado a lado (Pipefy bruto x valor consolidado x valor exibido) e apontar cada divergência com causa nomeada.

### Etapa 2 — Correções estruturais
- **Chave de identidade única**: criar `leadKey(lead)` = `cardId` → `email` → `nome+empresa`, e usá-la em todos os pontos de dedupe (`computeGroup`, `aggFromGroups`, `buildSyntheticGroup`, `totals`, drill-downs).
- **Uma venda, um grupo**: garantir que toda venda G4 seja atribuída a exatamente um grupo, com fallback determinístico quando não há `dataGanho` (primeira live, depois entrada no pipe).
- **Somatório à prova de rótulo**: no `g4-metrics`, registrar os rótulos monetários não classificados em log e nunca somar dois campos do mesmo grupo canônico; expor `camposUsados` por card no payload para auditoria.
- **Finders Fee sem sobreposição**: separar explicitamente `treeGroups` e `findersGroup`, e calcular o total do topo como união deduplicada dos dois.

### Etapa 3 — Verificação de invariantes (garantia do "100%")
Adicionar checagens que rodam sobre os dados carregados:
- soma dos TCVs por categoria + Finders Fee == TCV total do topo;
- nenhum `cardId` aparece em mais de um grupo entre as vendas;
- TCV de cada venda == MRR×12 + Setup + Pontual;
- quantidade de vendas no KPI == quantidade de linhas no drill-down.
Qualquer quebra aparece como aviso visível no dashboard (em vez de erro silencioso).

### Etapa 4 — Relatório final
Entregar a lista completa de vendas com origem (live/evento/finders), valores por componente e TCV, batendo com o Pipefy card a card.

## Detalhes técnicos
- Arquivos: `supabase/functions/g4-metrics/index.ts`, `src/components/planning/g4/G4ConsolidatedDashboard.tsx`, `src/components/planning/g4/canonLive.ts`.
- Nenhuma mudança em outras abas de indicadores; escopo restrito ao dash G4 (`/dash-g4` e a aba G4 interna, que compartilham o mesmo componente).
