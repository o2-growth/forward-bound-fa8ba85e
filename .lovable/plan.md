
## O que ajustar

Na seção **Dados reais das lives G4** (`src/components/planning/g4/G4RealSection.tsx`), fazer 3 correções — tudo no frontend, sem tocar na edge function `g4-metrics` nem no banco externo:

### 1. Deduplicar lives com nomes diferentes vindos da fonte

Hoje aparecem cards separados para a mesma live porque o campo `live` da tabela `g4_inscritos` tem variações de nome:

- `Live G4 - 20/05/2026` **e** `Live - G4 - 20-mai` → mesma live (20/05)
- `Live G4 - 21/05/2026` **e** `Live - G4 - 21-mai` → mesma live (21/05)

**Fix:** aplicar um mapa de canonicalização no cliente (antes de renderizar `data.funil`, `data.leads[].lives` e `data.diagnosticoPorLive`). Somar `inscritos`, `levantaramMao`, `vendas` e `diagnósticos` das variantes no rótulo canônico. Filtrar do dropdown de lives as variantes antigas para não aparecerem em lugar nenhum.

Mapa canônico proposto:
```
"Live - G4 - 20-mai"       → "Live G4 - 20/05/2026"
"Live - G4 - 21-mai"       → "Live G4 - 21/05/2026"
```
(fácil estender no futuro adicionando entradas.)

### 2. Injetar contagem manual de "Presentes" (medida ao vivo no Zoom)

A coluna `presentes` vem `null`/`0` da fonte porque não foi exportada. Sobrescrever no cliente com os valores medidos manualmente pelo time:

```
Live 20/05  → 52
Live 21/05  → 48
Live 17/06  → 243
Live 18/06  → 168
Live 02/07  → 165
```

Chaves reais dos rótulos da tabela: `Live G4 - 20/05/2026`, `Live G4 - 21/05/2026`, `Live G4 - 17/06/2026`, `Live G4 - 18/06/2026`, `Live G4 - 02/07/2026` (ajusto no código conforme os labels reais retornados pela edge — se algum vier diferente, mapeio pela data).

### 3. Tooltip explicando a origem do "Presentes"

No `LiveFunnelCard`, envolver o botão da coluna **Presentes** com um `Tooltip` (padrão shadcn, já importado no arquivo) com o texto:

> "Não exportado pela fonte — número medido manualmente pela equipe contando os participantes no Zoom durante a live."

Também colocar um pequeno indicador visual (ícone `Info` ao lado do label "PRESENTES") só nesse card para deixar claro que é manual.

## Fora de escopo

- Nenhuma alteração na edge function `g4-metrics` nem no banco G4 externo.
- Nenhuma mudança em outras seções (Lives G4 acima, Eventos, Seller).
- Nenhuma mudança na tabela de leads embaixo — só canonicalização dos nomes de live já pega ela de graça (via `l.lives`).

## Detalhes técnicos

- Arquivo único alterado: `src/components/planning/g4/G4RealSection.tsx`.
- Novos artefatos locais no arquivo: `LIVE_CANONICAL_MAP: Record<string,string>`, `PRESENTES_OVERRIDE: Record<string,number>`, e um `useMemo` que remapeia `data.funil` + `data.leads[].lives` + `data.diagnosticoPorLive` antes de tudo o que já existe.
- Sem novas dependências.
