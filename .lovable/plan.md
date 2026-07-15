# Oxy Hacker → sempre Inbound

## O que muda

Em `src/lib/leadSource.ts`, na regra 0.1 (que hoje já força `produto = "Franquia"` como Inbound), adicionar `"oxy hacker"` à mesma verificação.

Resultado: todo card cujo `Produtos` no Pipefy contenha "Franquia" **ou** "Oxy Hacker" é classificado como **Inbound**, independentemente de `tipoOrigem / origemLead / fonte / campanha` estarem vazios ou ruidosos.

## Trecho alterado

```ts
// 0.1) FRANQUIA + OXY HACKER — regra de negócio: todo card desses produtos
// é Inbound, independente de os campos de origem estarem preenchidos.
const produto = norm(c.produto);
if (produto.includes('franquia') || produto.includes('oxy hacker')) {
  return 'inbound';
}
```

## Impacto

- Cards Oxy Hacker que hoje caem em `sem_origem` (ou eventualmente em `outbound`/`indicacao` por ruído) passam para `inbound`.
- Afeta o filtro "Origem do lead" na aba Indicadores e todos os breakdowns por origem (Marketing, Growth, drill-downs).
- Não altera contagem de MQL / RM / RR / Proposta / Venda — só o **rótulo de origem**.
- Não mexe em Franquia (já era Inbound).

## Riscos

- Se algum card Oxy Hacker legítimo era de fato Outbound/Evento/Indicação, ele será reclassificado como Inbound. Confirmação de que essa é a regra desejada.

## Fora do escopo

- Nenhuma mudança em métricas monetárias, metas, dedup ou queries.
- Nenhuma mudança nas outras BUs.
