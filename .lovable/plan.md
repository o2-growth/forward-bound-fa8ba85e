## Diagnóstico

No card "Valor isentado por tratativa", o Grupo Imagem aparece como **R$ 3.429.316** mas o valor real é **R$ 34.293,16** — diferença de fator 100. Isso indica que o campo `Valor Isentado finalizacao` (e fallbacks) vem do Pipefy em **centavos**, não em reais. O `formatCurrency` está correto; o problema está no parsing.

Local: `src/hooks/useJornadaData.ts` linhas 209-211 (`readNum(...)` retornando o número bruto).

Esse valor é usado em dois lugares (ambos afetados):
- `isentamentos[].valor` → tabela "Valor isentado por tratativa" + KPI `valorIsentadoTotal`
- `tratativasResolvidas[].valorIsentado` → tabela de tratativas resolvidas

---

## Plano

### `src/hooks/useJornadaData.ts` (~linha 209)

Normalizar a leitura dividindo por 100:

```text
const valorIsentado = readNum(
  row['Valor Isentado finalizacao'] ?? row['Valor Isentado'] ?? row['Valor isentado'] ?? row['Valor Isentado Finalizacao']
) / 100;
```

Como ambos os arrays (`isentamentos` e `tratativasResolvidas`) consomem a mesma variável, e o total `valorIsentadoTotal` é derivado de `isentamentos`, a correção em um único ponto resolve KPI + ambas as tabelas.

### Validação

- Grupo Imagem deve passar de R$ 3.429.316 → **R$ 34.293,16**.
- KPI "Valor isentado (Atendimento O2)" no card de Operação deve cair proporcionalmente (todas as linhas /100).
- Conferir 1-2 outras linhas da tabela "Tratativas resolvidas" para garantir que os valores agora batem com o Pipefy.

### Fora do escopo

Não mexer em outros campos monetários da Jornada (MRR, churn) — esses já estão sendo tratados em outras leituras com normalizações próprias.
