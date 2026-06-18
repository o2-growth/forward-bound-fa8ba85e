---
name: Roadmap Fase 2 de Pessoas
description: 10 indicadores avançados de Pessoas com seus blockers — renderizados em FaseDoisRoadmap.tsx
type: feature
---
Aba Pessoas mostra um card "Fase 2 — Roadmap" (src/components/planning/pessoas/FaseDoisRoadmap.tsx) com:

1. Turnover voluntário × involuntário — falta motivo no Pipefy (entrega parcial: total desligados)
2. Custo de pessoal por área — falta centro de custo no Conta Azul
3. Headcount vs orçado — falta plano de headcount (parcial: HC atual)
4. Folha vs orçado — falta orçamento (parcial: custo realizado)
5. % OKRs definidos/atingidos — fonte não mapeada
6. eNPS / clima — falta ferramenta
7. % 1:1 realizados — falta registro padronizado
8. PDI / treinamento / promoções — falta pipe de desenvolvimento
9. Time to hire / custo por contratação — falta pipe de recrutamento
10. Absenteísmo — falta sistema de ponto

Saneamento (SaneamentoCard.tsx): ativos sem Data de contratação, inativos sem campo dedicado de desligamento (proxy updated_at), ativos sem Data de nascimento.

Distribuição etária (AgeDistribution.tsx): calcula idade a partir de Data de nascimento (pipefy_db_pessoas), buckets <25/25-30/30-35/35-40/40-50/>50, com quebra por BU via timeToBu.
