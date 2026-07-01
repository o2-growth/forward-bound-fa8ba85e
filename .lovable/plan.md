## Objetivo

Substituir a visualização em "cone" do `FunnelDeluxe` (usada em G4 Lives, Eventos, Sellers) pela direção **Premium analytics funnel** aprovada: linhas horizontais com coluna fixa de rótulo (Stage NN), barra preenchida proporcional ao % do topo dentro de um trilho de largura constante, ponte de conversão entre etapas e rodapé "Comparativo por item" no mesmo card.

## O que muda

Arquivo único: `src/components/planning/g4/FunnelDeluxe.tsx`

1. **Cone → linhas de largura constante.** Remover o `paddingLeft/paddingRight` que centralizava cada barra. Cada etapa vira uma linha `flex` com:
   - Coluna fixa (`w-32`, direita) com "Stage 0N" + nome da etapa.
   - Trilho de altura fixa (`h-14`), fundo `bg-muted/40`, preenchido por um bloco absoluto cuja largura = `% do topo` do funil (mín. 2% para permanecer visível). Gradiente por `step.key` mantém a paleta atual (emerald/teal/amber/rose).
   - Dentro do trilho: valor absoluto grande à esquerda (tabular-nums) e badge à direita ("100% TOPO" na 1ª etapa, "X,X% vs anterior" nas demais).

2. **Ponte de conversão entre etapas.** Entre linhas, uma barrinha vertical `w-0.5 h-6 bg-border` alinhada com a coluna de rótulo, seguida de um texto pequeno com a taxa (`"42,1% de retenção"`, `"Queda drástica (3,9%)"`, etc.). Cor do texto muda conforme a saúde da conversão (≥40% muted, 10–40% amber, <10% rose).

3. **Header do card do funil** (dentro do bloco cone) fica igual ao protótipo: label pequena "Conversão do funil", título grande do contexto, sub, e no canto direito o KPI "Conv. Inscritos → Venda" com número grande + `%` menor em muted.

4. **Comparativo entre itens.** Mantido, mas cada card do rodapé recebe o mesmo tratamento tipográfico (JetBrains Mono via `font-mono tabular-nums`) e destaque emerald quando a venda > 0, para casar com o protótipo. Zero mudança de dados/props.

5. **KPI Row (topo) e chips de filtro.** Permanecem exatamente como estão — só entram no protótipo por consistência tipográfica (`tabular-nums`).

## Fora de escopo

- Nenhuma mudança de dados/lógica: `stages`, `kpis`, `compare`, `chips` continuam iguais.
- Consumidores (`LivesSection`, `EventosSection`, `SellerSection`) não são tocados.
- Sem novas dependências. Uso apenas Tailwind + tokens semânticos existentes (evito `bg-black`, `text-white` — uso `bg-card`, `text-foreground`, `bg-muted`, `border-border`, mantendo compat com dark theme do dashboard).

## Verificação

- `tsgo` typecheck.
- Screenshot Playwright do card "Conversão do funil" em `/planning/g4` para confirmar visual.
