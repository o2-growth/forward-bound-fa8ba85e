## Diagnóstico

A linha "Protecface Respiradores" mostra **09/04/2026** (não 2025) como Encerramento porque:

1. Em `src/hooks/useOperationsData.ts:349`, `dataEncerramento` cai no fallback `tratEntradaDate` (a data em que a tratativa entrou na fase finalizada, `2026-04-10T20:11Z`) — **não** no campo correto `Data do churn` da Central de Projetos, que está preenchido como **18/03/2026**.
2. `toISOString().split('T')[0]` produz `"2026-04-10"` (UTC). Em `ChurnDossierSection.formatDate` (linha 17), `new Date("2026-04-10")` é interpretado como meia-noite UTC e renderizado em BRT (UTC-3), virando **09/04/2026**.

Resultado: data errada (entrada da tratativa em vez da data real do churn) **e** com shift de timezone.

---

## Plano

### 1. `src/hooks/useOperationsData.ts` (linhas ~340-350)

Mudar a hierarquia de `dataEncerramento` para usar **`Data do churn` da Central de Projetos como fonte primária**:

```text
dataEncerramento =
  card['Data do churn']                          // ← NOVA fonte primária (Central de Projetos)
  ?? card['Data encerramento']                   // fallback legado
  ?? trat?.['Finalizacao contrato ultimo dia']   // fallback tratativa
  ?? (saidaDate    ? toLocalDateBR(saidaDate)    : null)
  ?? (tratEntradaDate ? toLocalDateBR(tratEntradaDate) : null)  // último recurso
```

Normalizar tudo para `YYYY-MM-DD` no fuso `America/Sao_Paulo` via helper local (não usar `toISOString` cru), para evitar shift quando a fonte vier com timestamp.

### 2. `src/components/planning/nps/ChurnDossierSection.tsx` (`formatDate`, linhas 15-20)

Quando a string já vier no formato `YYYY-MM-DD` (sem hora), construir a `Date` como **local** para não voltar um dia em BRT:

```text
if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { ... });
}
```

### 3. Validação

- Protecface Respiradores → Encerramento deve mostrar **18/03/2026** e Mês Mar/2026.
- Conferir 2-3 outros churns recentes (Zebl, Aled, Cymaco) — devem continuar batendo com o que estava antes (eles caem no override do dossiê Q1 e não dependem desta data).
- Conferir que `ltMeses` (calculado via `diffInMonths(dataAssinatura, dataEncerramento)`) continua coerente com a nova data.

### Fora do escopo
- Não mexer em filtros (`CHURN_CUTOFF`, overrides de motivo) nem no stub sintético `synthetic-protectface` — depois que o card real ficar correto, avaliamos remover o stub.
