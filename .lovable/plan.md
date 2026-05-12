## Diagnóstico

Na tabela "Dossiê de Churn", a Rampanelli Redemac aparece como **Mar/2026**, mas a data real do churn é outra. As outras linhas (Amora, Fiagro, Alufacil) estão corretas em Abr/2026.

**Causa raiz** (`src/hooks/useOperationsData.ts:383`):

```ts
const mesChurn = trat ? formatMonthYear(trat['Entrada']) : (card['Mes do Churn'] || '');
```

`mesChurn` usa **`trat['Entrada']`** — a data em que o card da tratativa **entrou na fase finalizada** no Pipefy — em vez da data canônica do churn (`Data do churn` em Central de Projetos). É o mesmo padrão de bug que já corrigimos em `dataEncerramento` na rodada anterior, mas o `mesChurn` ficou de fora.

No caso da Rampanelli, a tratativa foi finalizada em Mar/2026, mas o churn em si aconteceu em outro mês (registrado em `Data do churn`). Por isso o "Mês do Churn" diverge do `dataEncerramento` (que já está correto).

---

## Plano

### `src/hooks/useOperationsData.ts` (linha 383)

Derivar `mesChurn` da **mesma hierarquia** de `dataEncerramento`, garantindo coerência entre as duas colunas:

```text
mesChurn =
  formatMonthYear(card['Data do churn'])                       // ← primária (Central de Projetos)
  ?? formatMonthYear(card['Data encerramento'])                // legado
  ?? formatMonthYear(trat?.['Finalizacao contrato ultimo dia'])// fallback tratativa
  ?? formatMonthYear(saidaDate ISO)                            // saída da fase
  ?? formatMonthYear(trat?.['Entrada'])                        // último recurso (comportamento antigo)
  ?? card['Mes do Churn']                                      // fallback final do próprio card
```

Implementação: criar uma const local `churnRefDate` que retorna a primeira string não-vazia da hierarquia acima, e passar para `formatMonthYear`. Reaproveita o helper já existente (`parsePipefyDate` aceita ISO `YYYY-MM-DD` e formato Pipefy).

### Validação

- **Rampanelli Redemac** → `Mês do Churn` deve passar de Mar/2026 para o mês correspondente a `Data do churn` da Central de Projetos.
- **Amora, Fiagro, Alufacil** → devem continuar em Abr/2026 (cai no mesmo campo, sem regressão).
- Conferir que `mesChurn` e `dataEncerramento` ficam **sempre coerentes** (mesmo mês/ano).
- Filtros do dossiê (período, ordenação por mês) continuam funcionando — o tipo do retorno é o mesmo.

### Fora do escopo

Outras tabelas/visões da Jornada que usam `trat['Entrada']` para fins distintos (ex.: cálculo de SLA de tratativa) não devem ser alteradas — apenas o "Mês do Churn" exibido no dossiê.
