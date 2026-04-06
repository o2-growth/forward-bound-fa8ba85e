

## Fix: Tela branca — redeclaração de `funnelData`

O último diff reverteu o fix anterior, trazendo de volta a duplicação da variável `funnelData` (linha 412 e linha 434).

### Correção

| Arquivo | Alteração |
|---------|-----------|
| `src/components/planning/IndicatorsTab.tsx` | Linha 412: renomear `data: funnelData` → `data: funnelRawData` |
| `src/components/planning/IndicatorsTab.tsx` | Linhas 415-421: trocar todas as referências de `funnelData` para `funnelRawData` dentro do `lastUpdated` useMemo |

A linha 434 (`const { funnelData, metasPorBU } = useMediaMetas()`) permanece intacta — é a variável usada no resto do componente para acessar `.modeloAtual`, `.o2Tax`, etc.

