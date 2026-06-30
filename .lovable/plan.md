## O que encontrei no Pipefy (consulta direta no DB sincronizado, sem gastar requisição na API Pipefy)

Filtro: cards do **Modelo Atual** (`pipefy_moviment_cfos`) com "g4" em **Tipo de Origem do lead**, **Origem do lead**, **Fonte** ou **Campanha**, deduplicados por ID.

### Totais
| Mês de criação | Cards G4 |
|---|---|
| **Jun/2026 (mês atual)** | **616** |
| Mai/2026 | 561 |
| Mar/2026 | 21 |
| Fev/2026 | 2 |
| Jan/2026 | 1 |
| Dez/2025 | 1 |
| Nov/2025 | 17 |

Expansão (`pipefy_cards_movements_expansao`): **0** cards G4. Não é fonte deste canal.

### Breakdown da fase atual dos 616 criados em Jun/2026
| Fase Atual | Cards |
|---|---|
| **G4 Tools** | **598** |
| Novos Leads | 11 |
| Em Contato | 2 |
| Reunião Realizada | 1 |
| Contrato em elaboração | 1 |
| EVENTOS | 1 |
| Perdido | 1 |
| Arquivado | 1 |

### O que isso significa para o Indicador Comercial

1. **Filtro por origem "Eventos" mostra os 616 corretamente** — `classifyLeadSource` já reconhece "g4" em qualquer um dos 4 campos (ajuste anterior). Confirmado.

2. **Mas no funil (Leads / MQL / Reunião / Proposta / Venda)** quase nada aparece, porque **598 dos 616 (97%) estão parados na fase "G4 Tools"** — uma fase de "estacionamento" que NÃO conta como Lead nem MQL nas regras atuais (Leads exige entrada em `Novos Leads` ou `MQLs`).
   - Só 11 viraram Lead efetivo, 2 Em Contato, 1 Reunião, 1 Proposta. Esses sim contam.

3. **Conclusão:** o dashboard está correto. Os 616 não somem — eles aparecem em "Eventos" no filtro de origem e na contagem total de cards G4. O funil mostra pouco volume porque a operação ainda não puxou os cards de `G4 Tools` para `Novos Leads`. Isso é **dado faltando no Pipefy**, não bug do dashboard.

### Opções

- **Opção A — não mexer (recomendado):** o dashboard reflete a realidade. O gargalo está na operação: 598 leads G4 do mês estão na fila "G4 Tools" sem serem trabalhados. Aviso a Mariana/SDRs.
- **Opção B — incluir "G4 Tools" como Lead:** trato fase `G4 Tools` como entrada equivalente a `Novos Leads` para o canal Eventos/G4. Inflaria leads do mês em ~598 mas distorceria taxa de conversão (Lead → MQL despencaria).
- **Opção C — criar uma seção "Aguardando triagem G4"** na aba Eventos G4 mostrando volume parado em `G4 Tools` por safra, pra dar visibilidade sem misturar com funil.

Me diz qual opção seguir (ou só confirma A e encerro).