# Fixar lista oficial de Abr/2026 no Dossiê de Churn

## Objetivo
A lista de Abr/2026 deve corresponder exatamente aos 8 clientes do XLSX oficial, com a data de encerramento informada lá.

## Lista oficial (XLSX)
| # | Cliente | Data | CFO | Motivo |
|---|---------|------|-----|--------|
| 1 | Agrupar corporate | 2026-04-03 | Gustavo Cochlar | Replanejamento do Cliente |
| 2 | Alufacil | 2026-04-13 | Eduardo Milani Pedrolo | Cliente Omisso |
| 3 | Amora Distribuidora | 2026-04-30 | Oliveira | Atendimento O2 |
| 4 | Fiagro | 2026-04-14 | Oliveira | Atendimento O2 |
| 5 | Grupo imagem | 2026-04-10 | Douglas Schossler | Atendimento O2 |
| 6 | Mineralis SA | 2026-04-03 | Gustavo Cochlar | Cliente Omisso |
| 7 | NutryPower Distribuidora Ltda | 2026-04-10 | Eduardo Milani Pedrolo | Cliente Omisso |
| 8 | Rumo Certo | 2026-04-02 | Eduardo D'Agostini | Replanejamento do Cliente |

## Mudança em `src/hooks/useOperationsData.ts`

1. Adicionar constante `APR_2026_OFFICIAL` = mapa `tituloNormalizado → { dataEncerramento, motivo, cfo }` com os 8 acima.
2. Após montar `churnDossier`:
   - **Forçar dados nos 8:** para cada card cujo título normalizado esteja no mapa, sobrescrever `dataEncerramento`, `mesChurn = 'Abr/2026'`, `motivoPrincipal` e `cfo` (mantém MRR/Setup/Produto vindos do Pipefy).
   - **Injetar ausentes:** se algum dos 8 não está em `churnDossier`, criar card sintético (sem MRR/Setup) com `faseAtual = 'Tratativa finalizada'` e link Pipefy vazio.
   - **Excluir intrusos:** remover qualquer card com `mesChurn === 'Abr/2026'` cujo título normalizado **não** esteja no mapa (Mundim & Co, Cristallux, Arcoiristintas, Barufaldi etc.).
3. Manter a heurística de correção de data já implementada (afeta outros meses normalmente).

## Resultado
Filtro Abr/2026 mostra exatamente os 8 clientes do XLSX, com as datas oficiais. Outros meses continuam usando a lógica dinâmica.
