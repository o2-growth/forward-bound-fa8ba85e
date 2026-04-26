## Problema

Ao buscar cards no Card Investigator, todos aparecem como **"(sem titulo)"** e os campos SDR, Closer, Faixa e Motivo da perda também ficam vazios.

## Causa Raiz

Confirmado nos logs da edge function (`query-external-db`) e na resposta de rede: o banco externo (Pipefy) retorna os nomes de coluna **com acentos e capitalização original do Pipefy**:

- `Título` (não `Titulo`)
- `SDR responsável` (não `SDR responsavel`)
- `Closer responsável` (não `Closer responsavel`)
- `Data Criação` (não `Data Criacao`)
- `Motivo da perda` ✓ (já correto)

Mas o código em `CardInvestigator.tsx` (linhas 264–275) lê as chaves **sem acento**, então o lookup falha em todas e cai no fallback `''`.

Já corrigimos o `searchColumn` para `'Título'` (com acento), mas o mapeamento dos resultados continua usando chaves erradas.

## Correção

**Arquivo:** `src/components/planning/indicators/CardInvestigator.tsx` (linhas ~264–275)

Atualizar as chaves de leitura para usar **primeiro** os nomes reais do banco (com acento), mantendo as variantes sem acento como fallback por segurança:

```typescript
titulo: row['Título'] || row['Titulo'] || row['titulo'] || row['Nome'] || row['Empresa'] || '',
fase: row['Fase'] || row['fase'] || '',
faseAtual: row['Fase Atual'] || row['fase_atual'] || '',
entrada: parseDate(row['Entrada'] || row['entrada']) || new Date(),
dataCriacao: parseDate(row['Data Criação'] || row['Data Criacao']),
sdr: row['SDR responsável'] || row['SDR responsavel'] || row['sdr_responsavel'] || '',
closer: row['Closer responsável'] || row['Closer responsavel'] || row['closer_responsavel'] || '',
faixaFaturamento: row['Faixa de faturamento mensal'] || row['Faixa'] || row['faixa'] || '',
motivoPerda: row['Motivo da perda'] || row['motivo_perda'] || '',
```

## Resultado Esperado

Após a correção, o Card Investigator vai exibir corretamente:
- Título da empresa (ex.: "Moto locação")
- SDR e Closer responsáveis
- Faixa de faturamento (essencial para o diagnóstico de MQL)
- Motivo da perda (essencial para o diagnóstico de exclusão de MQL)
- Data de criação do card

Sem essa correção, o diagnóstico de MQL fica incorreto (faixa sempre vazia → sempre "não qualifica").
