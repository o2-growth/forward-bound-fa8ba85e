# Classificar "Colaborador O2" como Indicação

## Problema
No `classifyLeadSource` (src/lib/leadSource.ts), o token `colaborador` só é reconhecido quando aparece em `tipoOrigem`. Quando o SDR escreve "Colaborador O2" (ou variações) em **Origem do lead**, **Fonte** ou **Campanha**, o card cai em **Sem origem** — e pior: como o texto contém "o2", pode ser capturado pela regra de Inbound (`o2inc`) e virar Inbound erroneamente.

## Mudança
Único arquivo: `src/lib/leadSource.ts`.

Adicionar, **antes** das regras de Inbound (passo 4), um bloco novo:

```ts
// 3.5) INDICAÇÃO — "colaborador" em qualquer campo textual (ex.: "Colaborador O2")
const colaboradorHay = [tipo, origem, fonte, campanha].filter(Boolean).join(' | ');
if (containsAny(colaboradorHay, ['colaborador'])) {
  return 'indicacao';
}
```

Isso garante:
- `tipoOrigem = "Indicação colaborador"` → indicação (já funcionava, continua)
- `origemLead = "Colaborador O2"` → indicação (novo)
- `fonte = "colaborador_o2"` → indicação (novo)
- `campanha = "colaborador"` → indicação (novo)

E precede a regra que hoje mandaria "colaborador o2" para Inbound via token `o2inc`.

## Escopo / segurança
- Nenhuma outra regra alterada: Franquia/Oxy → Inbound, Monetização, GSC → Outbound, placeholders Meta → Inbound, eventos G4, tudo intacto.
- Sem mudança de UI, sem mudança de hooks.

## Validação
Após build: abrir **Indicadores → Canal = Indicação** e conferir que cards com "Colaborador O2" agora aparecem lá; conferir que somem de "Sem origem" e não estão em Inbound.
