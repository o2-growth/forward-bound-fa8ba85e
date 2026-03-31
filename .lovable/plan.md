

## Fixar metas de funil (MQL, RM, RR, etc.) independentes do faturamento

### Problema
Quando o faturamento do Modelo Atual é redistribuído entre meses, o funil reverso recalcula automaticamente as metas de MQL, RM, RR, Proposta e Venda — o usuário quer que essas metas permaneçam fixas.

### Solução
Criar uma tabela `funnel_metas` no banco de dados para armazenar as metas de funil fixas. O sistema usará esses valores quando existirem, em vez de recalcular via funil reverso.

### Alterações

**1. Nova tabela `funnel_metas`** (migração SQL)
- Colunas: `bu`, `month`, `year`, `leads`, `mqls`, `rms`, `rrs`, `propostas`, `vendas`
- RLS: leitura para autenticados, escrita para admins
- Constraint unique em `(bu, month, year)`

**2. Seed inicial** — Inserir os valores atuais calculados pelo funil reverso como snapshot fixo (via script ou edge function), para que a tabela já tenha dados antes de qualquer redistribuição.

**3. `src/hooks/usePlanGrowthData.ts`** — Modificar o hook para:
- Buscar `funnel_metas` do banco para o Modelo Atual
- Se existirem valores na tabela, usá-los diretamente em vez de chamar `calculateReverseFunnel`
- Manter o funil reverso como fallback caso a tabela esteja vazia

**4. Painel Admin (opcional)** — Adicionar uma seção na aba Admin para editar as metas de funil manualmente, caso o usuário queira ajustá-las no futuro.

### Fluxo após implementação
```text
Antes:  faturamento muda → funil reverso recalcula MQL → metas de MQL mudam
Depois: faturamento muda → sistema busca funnel_metas → MQL permanece fixo
```

### Arquivos afetados
| Arquivo | Alteração |
|---------|-----------|
| Nova migração SQL | Criar tabela `funnel_metas` + seed com valores atuais |
| `src/hooks/usePlanGrowthData.ts` | Buscar `funnel_metas` e usar como fonte primária para Modelo Atual |
| `src/hooks/useFunnelMetas.ts` (novo) | Hook para CRUD da tabela `funnel_metas` |

