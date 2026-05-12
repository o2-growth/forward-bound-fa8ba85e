## Diagnóstico

A planilha enviada (`churn_ms_anterior_12-05-2026.xlsx`) é o **relatório oficial do CRM (Pipefy)** para os churns de Abril/2026 e mostra que:

- **A fonte canônica do mês do churn é o campo `Finalização do contrato (último dia trabalhado)` da Tratativa** (no código: `trat['Finalizacao contrato ultimo dia']`).
- **Abril/2026 oficial = 8 clientes**: Agrupar Corporate, Alufacil, Amora Distribuidora, Fiagro, Grupo Imagem, Mineralis SA, NutryPower Distribuidora, Rumo Certo.
- **Rampanelli Redemac NÃO está em Abril** → seu churn aconteceu em outro mês (provavelmente Mar/2026, como o usuário indicou). O dossiê hoje mostra Rampanelli em Abr porque a hierarquia atual de `dataEncerramento` em `useOperationsData.ts` pega a `Saída`/`Entrada` da tratativa (movimentação no Pipefy) em vez da data oficial de finalização do contrato.

A hierarquia atual prioriza:
1. `card['Data do churn']` (campo que **não existe** em `pipefy_central_projetos` — sempre `undefined`)
2. `card['Data encerramento']` (legado, pouco preenchido)
3. `trat['Finalizacao contrato ultimo dia']` (a fonte certa, mas hoje em 3º lugar)
4. `trat['Saída']` / `trat['Entrada']` (data de movimentação, não data real de churn)

Como o passo 1 e 2 falham para a maioria, e o passo 3 também pode falhar para alguns cards, cai no passo 4 — que é o que está deslocando a Rampanelli para Abril.

## Plano

### 1. `src/hooks/useOperationsData.ts` — Reordenar hierarquia de `dataEncerramento`

Tornar **`Finalizacao contrato ultimo dia` a fonte primária** (alinhado ao relatório oficial do CRM). A hierarquia passa a ser:

```text
dataEncerramento =
  toLocalDateBR(trat?.['Finalizacao contrato ultimo dia'])  // ← PRIMÁRIA (CRM oficial)
  ?? toLocalDateBR(card['Data do churn'])                   // backup (caso passe a existir)
  ?? toLocalDateBR(card['Data encerramento'])               // legado
  ?? toLocalDateBR(saidaDate)                               // saída da fase de tratativa
  ?? toLocalDateBR(tratEntradaDate)                         // último recurso
  ?? ''
```

`mesChurn` continua derivando de `dataEncerramento` (parse local YYYY-MM-DD) — corrige automaticamente.

### 2. Validar contra a planilha oficial

Após a alteração, o "Dossiê de Churn" filtrado em Abril/2026 deve listar **exatamente os 8 clientes do relatório**:

| Cliente | Mês esperado |
|---|---|
| Agrupar Corporate | Abr/2026 |
| Alufacil | Abr/2026 |
| Amora Distribuidora | Abr/2026 |
| Fiagro | Abr/2026 |
| Grupo Imagem | Abr/2026 |
| Mineralis SA | Abr/2026 |
| NutryPower Distribuidora | Abr/2026 |
| Rumo Certo | Abr/2026 |
| **Rampanelli Redemac** | **NÃO em Abr** (deve aparecer em Mar/2026 ou no mês correto) |

### 3. Logging defensivo (temporário)

Para acompanhar a correção, logar em `console.warn` quando um card cair no fallback de `Saída`/`Entrada` (passos 4–5), com o nome do cliente e a data resultante. Isso ajuda a identificar futuros casos onde o CFO não preencheu `Finalizacao contrato ultimo dia` na tratativa.

### Fora do escopo

- Não vamos alterar a leitura via cliente conectado (`pipefy_db_clientes` → `Data do churn`) por enquanto — a planilha oficial confirma que a Tratativa é a fonte autoritativa, então não é necessário criar `dataChurnMap`.
- Outras views (`useJornadaData.ts`, NPS, etc.) ficam para uma rodada futura se houver pedido explícito.

### Notas técnicas

- `parsePipefyDate` em `dateUtils.ts` já trata corretamente strings ISO (`YYYY-MM-DD`) que é o formato vindo do Pipefy para esse campo (visto na planilha: `2026-04-03`, `2026-04-13`, etc.).
- `toLocalDateBR` já evita shift de timezone para o fuso BR.
- O filtro `CHURN_CUTOFF` (Out/2025) e `CHURN_OVERRIDES` (motivos da planilha Q1) permanecem inalterados.
