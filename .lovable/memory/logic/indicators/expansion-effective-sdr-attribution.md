---
name: Expansion Effective SDR Attribution (fullHistory fallback)
description: Em Expansão, SDR/Closer dos movimentos de Lead/MQL são preenchidos retroativamente via último não-vazio do fullHistory
type: logic
---

## Problema

No Pipefy de Expansão (Franquia / Oxy Hacker), o campo `SDR responsável` só é preenchido quando o card avança para "Tentativas de contato". Movimentos das fases **Lead** e **MQL** vêm com `sdr = null`, mesmo que o card já pertença a um SDR (Kethlin/Bruna) no mundo real.

Resultado anterior: filtrar SDR no `ClickableFunnelChart` derrubava 18 de 23 MQLs em jun/2026 (Franquia), pois o `matchCardSdr` lia o SDR do movimento daquela fase específica.

## Solução

No `useExpansaoAnalytics.ts`:

1. Construir mapas `effectiveSdrByCard` e `effectiveCloserByCard` percorrendo `cards + fullHistory` em ordem cronológica, guardando o **último valor não-vazio** por `cardId`.
2. Helper `enrichCardWithEffectiveOwners(card)` preenche `sdr`/`closer`/`responsavel` quando vazios no movimento, usando os mapas.
3. Aplicar enriquecimento em `getCardsForIndicator` (retorno) e em `toDetailItem`.

Como o fallback só preenche quando vazio, é seguro para todas as fases — Lead/MQL ganham SDR retroativo; fases avançadas não mudam.

## Escopo

Apenas Expansão. Modelo Atual e O2 TAX não precisam desse fix pois atribuem SDR via round-robin na criação do card.

## Prioridade

`sdr` antes de `closer`. `responsavel` segue regra original do parser (`Closer || SDR`).
