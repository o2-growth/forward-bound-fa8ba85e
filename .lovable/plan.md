

## Corrigir meta de faturamento da Franquia (Mar e Jan zerados)

### Diagnóstico

No banco de dados (`monetary_metas`), a Franquia tem:
- **Jan**: faturamento = 0, pontual = 0, vendas = 0 → OK (zero vendas)
- **Mar**: faturamento = 0, pontual = 0, **vendas = 1** → **BUG** — deveria ser R$ 140k

Março foi zerado acidentalmente na última edição (30/03 às 22:09). Como o `useConsolidatedMetas` prioriza o banco e o valor é 0, ele não faz fallback para o Plan Growth.

### Correção

Atualizar o registro de Março no banco:

```sql
UPDATE monetary_metas 
SET faturamento = 140000, pontual = 140000 
WHERE bu = 'franquia' AND month = 'Mar' AND year = 2026;
```

Isso é uma correção de dados, sem alteração de código.

### Resultado esperado

O indicador Fat Incremento da Franquia em Março passará a mostrar R$ 140.000 (1 venda × R$ 140k).

