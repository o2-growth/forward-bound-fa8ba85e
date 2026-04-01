

## Atualizar MRR Base de Março/2026 para R$ 667.987

### Alteração

Atualização de dados no banco — sem alteração de código.

| Tabela | Registro | Campo | Valor atual | Novo valor |
|--------|----------|-------|-------------|------------|
| `mrr_base_monthly` | Mar / 2026 | `value` | 755.000 | 667.987 |

### SQL

```sql
UPDATE mrr_base_monthly 
SET value = 667987, updated_at = now() 
WHERE month = 'Mar' AND year = 2026;
```

### Impacto

O Plan Growth recalculará automaticamente o "A Vender" de Março e os meses seguintes (cascata via churn/retenção), atualizando metas de funil reverso em todas as abas dependentes.

