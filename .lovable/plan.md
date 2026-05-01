## Diagnóstico

Confirmei direto no banco Pipefy externo (tabelas `pipefy_central_projetos`, `pipefy_moviment_rotinas`, `pipefy_moviment_setup`):

```
ID 1299643591 | Garantia Br | CFO Responsavel = "Oliveira"
                            | Responsavel    = "Adivilso Souza de Oliveira Junior"
                            | Fase Atual     = "Em Operação Recorrente"
                            | updated_at     = 2026-05-01 15:29
```

**O dado no banco está correto: Garantia Br pertence ao Oliveira.** Não existe nenhum registro com "Everton" para esse cliente em nenhuma das tabelas auxiliares.

Logo, o motivo de ainda aparecer no Everton é **cache do front-end** — não é bug de lógica nem dado errado.

### Onde está o cache

`src/hooks/useJornadaData.ts` (linha 87) usa React Query com:
```ts
staleTime: 5 * 60 * 1000   // 5 minutos
```

Como sua sessão do navegador foi aberta **antes** do `updated_at = 15:29`, o React Query devolveu a versão antiga em memória. Não há `refetchOnWindowFocus`, então só atualiza:
- ao recarregar a página (F5), ou
- após 5 min de inatividade da query, ou
- ao fechar/abrir o navegador.

Não há mapa de override no código que jogue Garantia Br para o Everton — confirmado em `CFO_NAME_NORMALIZE` (só normaliza nomes longos, não muda CFO).

## O que fazer

Três opções, em ordem do mais simples ao mais robusto:

### Opção A — Verificação imediata (sem código)
Apertar **Cmd/Ctrl + Shift + R** (hard reload) na aba do dashboard. Garantia Br deve sumir do Everton e aparecer no Oliveira na hora.

### Opção B — Botão "Atualizar dados" na aba Jornada
Adicionar um botão de refresh no header das views (CFOs, Reuniões, Clientes) que invalida a query `['jornada-data']` via `queryClient.invalidateQueries`. Útil para o time não depender de hard reload.

### Opção C — Reduzir `staleTime` ou habilitar `refetchOnWindowFocus`
Mudar `staleTime` de 5 min para algo como 60 s, ou ativar `refetchOnWindowFocus: true` no `useQuery`. Trade-off: mais chamadas ao Edge Function `query-external-db` (que faz consulta SQL pesada às 7 tabelas Pipefy).

## Recomendação

Como a divergência é **percepção causada por cache**, sugiro:
1. Hard reload agora para confirmar (Opção A).
2. Implementar **Opção B** (botão de refresh manual visível) — mantém custo baixo no Edge Function e dá controle ao time quando alguém altera algo no Pipefy.

Confirma se quer que eu implemente o botão de refresh, ou se prefere que eu reduza o `staleTime` (Opção C)?
