## Objetivo
Na seção **Temperatura** do Indicador Comercial, não contar cards que estejam na fase **Perdido** (ou equivalente) do pipe, mesmo que ainda tenham tag de temperatura (Quente/Morno/Frio) ou se enquadrem na regra de Monetização (Upsell/Cross-sell/Troca).

## Mudança
Arquivo único: `src/components/planning/indicators/temperaturaAggregator.ts`

1. Adicionar helper `isPerdido(card)` que verifica se a fase atual do card é uma fase de perda:
   - Modelo Atual / Outbound / Franquia / Oxy Hacker: fase normalizada igual a `"perdido"` (também aceitar variações como `"perda"`, `"lost"`, `"descartado"` por segurança via normalização — trim/lowercase/sem acento, conforme regra global do projeto).
   - Monetização: fase igual a `"Perdido"` OU `motivoPerda` preenchido (card.perdido === true já existe no `MonetizacaoCard`).

2. No loop principal (sources Modelo/Outbound/Franquia/Oxy): após o dedup por id, pular o card se `isPerdido(card)` antes de jogar no bucket de temperatura — não conta nem em `tagged` nem em `semTag`.

3. No bloco de Monetização: pular cards onde `card.perdido === true` ou fase normalizada = "perdido", além das checagens já existentes.

## Validação
- Typecheck.
- Conferir manualmente no dashboard: o total de Quentes deve diminuir pelos cards de Cross-sell/Upsell/Troca que estão em "Perdido" e pelos cards de Modelo Atual marcados como Quente que foram perdidos no período.

## Fora de escopo
- Não mexer em `CenarioCaixaSection` (consome os mesmos buckets, herda o fix automaticamente).
- Não alterar acelerômetro nem outras seções.
