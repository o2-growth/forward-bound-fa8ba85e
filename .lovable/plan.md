## Adicionar Matheus como SDR de Modelo Atual

### Mudanças

1. **`src/hooks/useSdrMetas.ts`**:
   - Adicionar `'Matheus'` à constante `SDRS`.
   - Em `BU_SDRS.modelo_atual`, incluir `'Matheus'` (lista final: `['Amanda', 'Carol', 'Matheus']`).
   - Refletir no aba Admin → Metas SDR: Matheus passa a aparecer com colunas RM/RR para preencher por mês.

2. **`src/components/planning/IndicatorsTab.tsx`**:
   - Adicionar `'Matheus'` em `BU_SDRS.modelo_atual` (linha 88) → entra no filtro de SDR do dashboard quando Modelo Atual está selecionada.
   - Adicionar `{ value: 'Matheus', label: 'Matheus' }` em `sdrOptions` (linha 95) → aparece no MultiSelect de SDR.

### Resultado

- Aba Admin → Metas SDR mostra Matheus na BU Modelo Atual com campos RM/RR editáveis por mês.
- Filtro de SDR no Dashboard Comercial passa a listar Matheus quando Modelo Atual está selecionada.
- Quando o usuário filtra por Matheus, as metas RM/RR somam apenas as metas dele (vinda de `sdr_metas`), e o realizado já filtra cards via `responsavel/sdr === Matheus` (lógica existente).

### Fora de escopo

- Não criar registros iniciais em `sdr_metas` para Matheus — eles serão criados via UI quando o admin editar. O hook já lida com upsert.