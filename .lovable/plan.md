# Solução: Onboarding Atrasado com cards fantasmas

## Diagnóstico
Problema é de **lógica do sistema**, não do banco. O hook `useJornadaData.ts` consulta apenas o pipe Rotinas isoladamente. Quando um cliente avança no Central de Projetos (vai pra "Em Operação Recorrente", "Em Tratativa", etc), o card da rotina de onboarding não é movido no Pipefy e permanece com `Data Prevista` vencida — gerando alerta falso.

Cards afetados hoje: AVML, Balbúrdia, Cotrim, Etel, Getconnect, Grb, Grupo Lidon, IDB Hospitais, SAFRA OBRAS.

## Solução proposta
Defensiva no frontend (não depende de mexer no Pipefy). Em `src/hooks/useJornadaData.ts`, bloco `=== 8. Onboarding atrasado ===` (linhas 1018–1057):

1. Antes do loop das rotinas, montar `Set<string> activeOnboardingTitles` com os títulos normalizados de `data.projetos` cuja `Fase Atual === 'Onboarding'`.
2. Dentro do loop, após obter o título do card de rotina, se o título normalizado **não** estiver em `activeOnboardingTitles`, fazer `continue` — ignorando o card fantasma.
3. Manter dedup por ID, cálculo de dias de atraso e ordenação como estão.

Mesma estratégia já usada em outros pontos do hook (cruzar Rotinas com clientes ativos).

## Resultado esperado
- Os 9 cards listados deixam de aparecer em "Onboarding atrasado".
- Só permanecem alertas de clientes que realmente estão na fase Onboarding hoje.
- Zero impacto em outras métricas/abas.

## Observação operacional (fora do escopo do código)
Para resolver na raiz, o time precisa mover/arquivar no Pipefy os cards do pipe Rotinas quando o cliente sai de Onboarding. Esse fix do frontend protege o dashboard enquanto isso não acontece.