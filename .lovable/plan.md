

## Ajustar MRR Base de Abril/2026 para R$ 667.987

### Situação atual

A tabela `mrr_base_monthly` tem registros para Jan, Fev e Mar de 2026. **Abril não existe ainda.** O usuário quer que o MRR base de Abril seja R$ 667.987 (mesmo valor de Março).

### Correção

Inserir um novo registro na tabela:

```sql
INSERT INTO mrr_base_monthly (month, year, value, is_total_override)
VALUES ('Abr', 2026, 667987, true);
```

Isso fará o Plan Growth usar R$ 667.987 como ponto de partida do MRR para Abril, afetando o cálculo de "A Vender" e funil reverso desse mês em diante.

