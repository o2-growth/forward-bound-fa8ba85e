

## Fix: Tela branca causada por erros de compilação

### Causa raiz

Há uma variável `funnelData` declarada **duas vezes** no `IndicatorsTab.tsx`:

1. **Linha 412**: `const { data: funnelData, ... } = useFunnelRealized(...)` → tipo `FunnelRealizedRecord[]`
2. **Linha 434**: `const { funnelData, ... } = useMediaMetas()` → tipo `FunnelDataByBU`

Isso causa erro de redeclaração (`TS2451`) e todos os acessos como `funnelData.modeloAtual` falham porque o TypeScript resolve o tipo errado.

Há também um erro no edge function `query-external-db` com `npm:pg@8.13.1`, mas esse não afeta o build do frontend.

### Correção

| Arquivo | Alteração |
|---------|-----------|
| `src/components/planning/IndicatorsTab.tsx` | Renomear `data: funnelData` na linha 412 para `data: funnelRawData` (ou `rawFunnelData`). Atualizar a referência no `lastUpdated` useMemo (linhas 415-420) para usar `funnelRawData` |

Apenas 2 linhas precisam mudar:
- Linha 412: `{ data: funnelRawData, getTotal, ...}`  
- Linha 415: `if (!funnelRawData || funnelRawData.length === 0) return null;`
- Linhas 416-419: usar `funnelRawData` no reduce

O `funnelData` da linha 434 (MediaMetasContext) permanece intacto — é o que todo o resto do componente usa corretamente.

