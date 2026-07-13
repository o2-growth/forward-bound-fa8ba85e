# Excluir "Contato futuro" dos Quentes (Indicadores → Comercial)

## Problema
Cards em fase **"Contato futuro"** (lead em standby) estão aparecendo no chip 🔥 Quente da seção Temperatura dos Leads e no Pace Comercial, poluindo o pipeline "vivo".

## Solução
No agregador de temperatura (`src/components/planning/indicators/temperaturaAggregator.ts`), tratar "Contato futuro" como fase excluída — mesma lógica de exclusão já usada para fases perdidas/ganhas.

### Mudanças
1. Adicionar constante `STANDBY_PHASES = new Set(["contato futuro"])` e helper `isStandbyPhase(fase)` (usando o `normalize` já existente).
2. Dentro do loop das 4 BUs comerciais (Modelo Atual, Outbound, Franquia, Oxy Hacker), após `isWonPhase` e `anyRowIsLost`, adicionar:
   ```ts
   if (isStandbyPhase(card.faseAtual)) continue;
   ```
3. No bloco de Monetização, adicionar a mesma checagem junto das demais exclusões (`perdido || ganho || isLostPhase || isWonPhase || isStandbyPhase`).

## Impacto
- Chip 🔥 Quente, 🌤 Morno e ❄ Frio param de contar cards em "Contato futuro".
- Pace Comercial (que consome o mesmo agregador) passa a refletir só o pipeline realmente ativo.
- Nenhuma outra tela é afetada — os hooks de MQL/RM/RR/Venda continuam contando "Contato futuro" como MQL conforme regra atual do Outbound.

## Arquivo alterado
- `src/components/planning/indicators/temperaturaAggregator.ts`
