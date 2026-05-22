import type { DataSourceSpec } from './DataSourceInfo';

/**
 * Catálogo único de fontes de dados da aba Operação.
 * Cada chave descreve de onde a informação vem (sistema → recurso),
 * a regra de cálculo aplicada e link direto quando útil.
 *
 * IDs dos pipes Pipefy (mantidos em mem://tech/pipefy/deep-linking-config-v2):
 *  - Central de Projetos: 305887184
 *  - NPS: pipe próprio (link genérico p/ workspace)
 *  - Squads: A5RCtMH5 (DB)
 *  - Config Financeiras: pw3daco_ (DB)
 */

const PIPEFY = {
  centralProjetos: 'https://app.pipefy.com/pipes/305887184',
  workspace: 'https://app.pipefy.com',
};

export const DS: Record<string, DataSourceSpec> = {
  // ─── Base de clientes / operação ─────────────────────────────────────────
  CLIENTES_ATIVOS: {
    sources: [
      { system: 'Pipefy', resource: 'Pipe "Central de Projetos"', url: PIPEFY.centralProjetos },
    ],
    rules: [
      'Inclui cards nas fases Onboarding e Em Operação Recorrente',
      'Cards de teste excluídos via isTestCard (lista fixa de IDs)',
      'Comparação de fases normalizada (trim, lowercase, sem acento)',
    ],
    notes: 'Sincronizado em tempo real via Edge Function pipefy-sync',
  },

  ONBOARDING: {
    sources: [{ system: 'Pipefy', resource: 'Central de Projetos · fase "Onboarding"', url: PIPEFY.centralProjetos }],
    rules: ['Cards atualmente na fase Onboarding', 'Cards de teste excluídos'],
  },

  OPERACAO_RECORRENTE: {
    sources: [{ system: 'Pipefy', resource: 'Central de Projetos · fase "Em Operação Recorrente"', url: PIPEFY.centralProjetos }],
    rules: ['Cards atualmente na fase Em Operação Recorrente', 'Cards de teste excluídos'],
  },

  EM_TRATATIVA: {
    sources: [{ system: 'Pipefy', resource: 'Central de Projetos · fase "Em Tratativa"', url: PIPEFY.centralProjetos }],
    rules: ['Cards em fase de retenção/tratativa ativa', 'Cards de teste excluídos'],
  },

  SETUP_STATUS: {
    sources: [{ system: 'Pipefy', resource: 'Central de Projetos · etapas de Setup', url: PIPEFY.centralProjetos }],
    rules: [
      'Ignora fases terminais (Entregue, Concluído, Cancelado, Arquivado)',
      'Destaca cards com mais de 90 dias de atraso',
    ],
  },

  // ─── MRR / Financeiro ────────────────────────────────────────────────────
  MRR_TOTAL: {
    sources: [
      { system: 'Pipefy', resource: 'Campos "MRR CFOaaS" + "MRR OXY" no card', url: PIPEFY.centralProjetos },
    ],
    rules: [
      'MRR Total = CFOaaS + OXY de cards ativos',
      'Considera apenas fases Onboarding e Em Operação Recorrente',
      'Soma feita no client após hidratação dos cards',
    ],
    notes: 'Não usa Oxy Finance API — vem direto do card no Pipefy',
  },

  TICKET_MEDIO: {
    sources: [{ system: 'Pipefy', resource: 'Central de Projetos · MRR / nº clientes', url: PIPEFY.centralProjetos }],
    rules: ['Ticket Médio = MRR Total / nº de clientes ativos do CFO'],
  },

  CUSTO_SQUAD: {
    sources: [
      { system: 'Pipefy', resource: 'DB "Squads" (A5RCtMH5)', url: PIPEFY.workspace },
      { system: 'Pipefy', resource: 'DB "Configurações Financeiras" (pw3daco_)', url: PIPEFY.workspace },
    ],
    rules: ['Custo Squad = soma dos custos mensais dos integrantes do squad do CFO'],
  },

  MARGEM_CFO: {
    sources: [
      { system: 'Pipefy', resource: 'MRR (card) – Custo Squad', url: PIPEFY.centralProjetos },
    ],
    rules: ['Margem = MRR Total – Custo Squad', 'Margem % = Margem / MRR Total'],
  },

  // ─── Churn ───────────────────────────────────────────────────────────────
  CHURN_DOSSIE: {
    sources: [
      { system: 'Pipefy', resource: 'Central de Projetos · fase "Churn"', url: PIPEFY.centralProjetos },
      { system: 'Banco Lovable', resource: 'Overrides oficiais (Abril/2026)' },
    ],
    rules: [
      'Reconhecimento pela "Data de assinatura do contrato" / data oficial de encerramento',
      'Inclui MRR perdido, LT médio e Pontual',
      'Cards de teste excluídos',
    ],
    notes: '8 overrides aplicados em Abr/26 para corrigir atribuição de CFO',
  },

  CHURN_QTD: {
    sources: [{ system: 'Pipefy', resource: 'Central de Projetos · fase "Churn"', url: PIPEFY.centralProjetos }],
    rules: ['Filtrado pela data de encerramento dentro do período selecionado'],
  },

  CHURN_MRR: {
    sources: [{ system: 'Pipefy', resource: 'Campo MRR no card de churn', url: PIPEFY.centralProjetos }],
    rules: ['Soma de MRR (CFOaaS + OXY) dos clientes que entraram em Churn no período'],
  },

  CHURN_LT: {
    sources: [{ system: 'Pipefy', resource: 'Campo "Data de assinatura do contrato"', url: PIPEFY.centralProjetos }],
    rules: ['LT médio (meses) entre assinatura e data oficial de encerramento'],
  },

  // ─── NPS ─────────────────────────────────────────────────────────────────
  NPS_RESPOSTAS: {
    sources: [
      { system: 'Pipefy', resource: 'Pipe NPS (respostas)', url: PIPEFY.workspace },
      { system: 'Pipefy', resource: 'Central de Projetos (vínculo CFO)', url: PIPEFY.centralProjetos },
    ],
    rules: [
      'Atribuição de CFO prioriza conexão com Central de Projetos',
      'Filtros: Produto, CFO, Ano, Período',
    ],
    notes: 'Join feito em tempo real no client',
  },

  NPS_SCORE: {
    sources: [{ system: 'Pipefy', resource: 'Pipe NPS', url: PIPEFY.workspace }],
    rules: ['NPS = % Promotores (9–10) − % Detratores (0–6)'],
  },

  NPS_DISTRIBUICAO: {
    sources: [{ system: 'Pipefy', resource: 'Pipe NPS', url: PIPEFY.workspace }],
    rules: ['Promotores: 9–10 · Neutros: 7–8 · Detratores: 0–6'],
  },

  NPS_OKR: {
    sources: [{ system: 'Pipefy', resource: 'Pipe NPS', url: PIPEFY.workspace }],
    rules: ['Proximidade da meta de NPS definida para o trimestre'],
  },

  NPS_QUARTERLY: {
    sources: [{ system: 'Pipefy', resource: 'Pipe NPS · histórico trimestral', url: PIPEFY.workspace }],
    rules: ['Comparação NPS por trimestre, com mesmos filtros aplicados'],
  },

  NPS_FEEDBACK: {
    sources: [{ system: 'Pipefy', resource: 'Campo de comentário no Pipe NPS', url: PIPEFY.workspace }],
    rules: ['Feedback qualitativo agregado por categoria / sentimento'],
  },

  // ─── Reuniões ────────────────────────────────────────────────────────────
  REUNIOES: {
    sources: [{ system: 'Pipefy', resource: 'Central de Projetos · campos de reunião', url: PIPEFY.centralProjetos }],
    rules: [
      'Realizadas: reunião com data passada e flag "realizada"',
      'Marcadas: reunião agendada futura',
      'Sem reunião: cliente ativo sem nenhuma reunião no período',
    ],
    notes: 'Mês inicial = último mês com dados disponíveis',
  },

  // ─── Alertas / Tarefas ───────────────────────────────────────────────────
  TAREFAS_ATRASADAS: {
    sources: [{ system: 'Pipefy', resource: 'Central de Projetos · campos de tarefa', url: PIPEFY.centralProjetos }],
    rules: [
      'Tarefas com due_date < hoje e não concluídas',
      'Exclui fases terminais (Entregue, Concluído, Cancelado, Arquivado)',
    ],
  },

  ALERTAS: {
    sources: [
      { system: 'Pipefy', resource: 'Central de Projetos', url: PIPEFY.centralProjetos },
      { system: 'Pipefy', resource: 'Pipe NPS', url: PIPEFY.workspace },
    ],
    rules: [
      'Tarefas atrasadas, NPS detrator, tratativa longa, sem reunião',
      'Cards de teste excluídos',
    ],
  },

  TRATATIVAS_ATIVAS: {
    sources: [{ system: 'Pipefy', resource: 'Central de Projetos · fase "Em Tratativa"', url: PIPEFY.centralProjetos }],
    rules: ['Cards em tratativa há > 30 dias destacados'],
  },

  // ─── Cliente 360 ─────────────────────────────────────────────────────────
  CLIENTE_360: {
    sources: [
      { system: 'Pipefy', resource: 'Card na Central de Projetos', url: PIPEFY.centralProjetos },
      { system: 'Pipefy', resource: 'Pipe NPS (respostas vinculadas)', url: PIPEFY.workspace },
      { system: 'Pipefy', resource: 'Campos de reuniões e tarefas no card', url: PIPEFY.centralProjetos },
    ],
    rules: ['Visão agregada por cliente: fase, MRR, NPS, reuniões, tarefas, churn'],
  },

  // ─── Health Score ────────────────────────────────────────────────────────
  HEALTH_SCORE: {
    sources: [
      { system: 'Pipefy', resource: 'NPS + Tarefas atrasadas + Reuniões + Tratativa', url: PIPEFY.centralProjetos },
    ],
    rules: ['Score composto a partir de NPS, tarefas atrasadas, ausência de reunião e tempo em tratativa'],
    notes: 'Cálculo client-side a partir dos cards hidratados',
  },
};

export default DS;
