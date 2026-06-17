## Atualizar MRR Base de Maio/2026

Inserir o valor de MRR Base de Maio/2026 = **R$ 692.582,00** na tabela `mrr_base_monthly`, com `is_total_override = true` para impedir que o sync automático sobrescreva.

Junho/2026 (R$ 722.605) já está correto e os demais meses permanecem inalterados.

### Passos
1. `INSERT ... ON CONFLICT (month, year) DO UPDATE` em `mrr_base_monthly` para Maio/2026 = 692582, `is_total_override = true`.
2. Verificar com `SELECT` que Maio retorna 692.582 e Junho continua 722.605.
3. Confirmar na view de Operação que o filtro de data em Maio/2026 passa a refletir R$ 692.582 (sem fallback para Junho).
