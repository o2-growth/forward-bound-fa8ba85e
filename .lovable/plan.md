# Mapear todos os cards com "g4" como Evento

## Problema
Hoje o `classifyLeadSource` só procura tokens de evento em `tipoOrigem`, `origemLead` e `campanha`. Cards com sinal de G4 em **`Fonte`** (ex.: 9 cards de junho/26 com `Fonte = "Live - G4 - 18/06"` e demais campos vazios) caem como **Sem origem** em vez de **Evento**.

Além disso, mesmo nos campos já olhados, a regra de evento exige tokens específicos — basta `g4` aparecer em qualquer um dos quatro campos pra ser Evento.

## Mudanças

### 1. `src/lib/leadSource.ts` — regra de Evento
Na seção **1) EVENTO**, expandir o gatilho para olhar também `fonte` e considerar `g4` / `live g4` / `live-g4` em qualquer um dos 4 campos (`tipoOrigem`, `origemLead`, `fonte`, `campanha`):

- Se o haystack combinado (`tipo + origem + fonte + campanha`, normalizado) contiver qualquer um destes tokens → retornar `'evento'`:
  - `g4`, `live-g4`, `live g4`, `summit`, `talkshow`, `talk show`, `4am`, `evento`, `imersao`, `presencial`, `webinar`, `palestra`, `workshop`, `speaker`
- Normalização: além do `NFD` atual, **remover hífens** (`-` → espaço) antes do match, pra `Live-G4-18-junho` casar com `live g4`.

### 2. `src/lib/eventSubcategory.ts` — subcategoria
- Aceitar os mesmos 4 campos no input (`origemLead`, `tipoOrigem`, `campanha`, **`fonte`**) e aplicar a mesma normalização (remoção de hífens).
- Regra nova: se tiver `g4` + nome de cidade/data **sem** `live`/`summit`/`4am`/`talkshow`/`speaker`/`presencial` → classificar como **Evento Presencial** (em vez do balde `G4 — Outros`). Isso cobre `"G4 São Paulo - 6 de Maio"`.
- Manter o resto da hierarquia (Summit > Live > 4AM > Talkshow > Speaker > Presencial > G4 — Outros).

### 3. Propagar `fonte` para `classifyEventSubcategory`
Procurar todos os call-sites de `classifyEventSubcategory` (principalmente `src/components/planning/indicators/EventosG4Section.tsx` e qualquer hook de analytics que classifique evento) e passar `fonte` no objeto de input. Os cards já carregam `fonte` no `AttributionCard` (`src/components/planning/marketing-indicators/types.ts`), então é só repassar.

## Validação
Depois da mudança, rodar a mesma query de junho/2026 mentalmente:

- `Live-G4-*` (1.248 cards) → continuam **Evento → G4 Live** ✅
- `Live - G4` / `Live - G4 - 17-Jun` (52) → continuam **Evento → G4 Live** ✅
- `G4 São Paulo - 6 de Maio` (2) → passam a ser **Evento → Evento Presencial** ✅
- `Fonte = "Live - G4 - 18/06"` (9) hoje em "Sem origem" → passam a **Evento → G4 Live** ✅
- `Funil Diagnóstico O2`, `Webflow Form` → continuam **não-evento** ✅

Nenhuma migração de banco; mudança é só no classificador front-end.
