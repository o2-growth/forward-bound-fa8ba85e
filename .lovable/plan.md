## Objetivo

Fazer o card **Faturamento (em pace)** no `IndicatorsTab` ocupar toda a largura da viewport (edge-to-edge), mantendo o scroll vertical normal da página.

## Mudanças

**Arquivo:** `src/components/IndicatorsTab.tsx` (linhas ~3284-3297, onde `<RevenuePaceChart />` é renderizado dentro do `<Suspense>`)

Envolver o bloco em um wrapper que faz "full-bleed" — escapa do container pai (que tem padding/max-width) usando a técnica padrão Tailwind:

```tsx
<div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen px-4 sm:px-6 lg:px-8">
  <Suspense fallback={...}>
    <RevenuePaceChart ... />
  </Suspense>
</div>
```

- `w-screen` + `-mx-[50vw]` + `left-1/2 right-1/2`: estoura o container e ocupa 100% da viewport.
- `px-4 sm:px-6 lg:px-8`: mantém respiro lateral leve para não colar nas bordas.
- Nenhuma alteração em scroll/overflow → a rolagem da página continua idêntica.

## Fora do escopo

- Nenhuma mudança no `RevenuePaceChart.tsx` (componente interno permanece igual; já é responsivo via `ResponsiveContainer`).
- Nenhuma mudança em lógica de dados, filtros ou outros gráficos.
