import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectCard {
  ID: string;
  'Título': string;
  'Fase': string;
  'Fase Atual': string;
  'Entrada': string;
  'Saída': string | null;
  'Duração (s)': number | null;
  'CFO Responsavel': string | null;
  'Valor CFOaaS': string | null;
  'Valor Educacao': string | null;
  'Valor Diagnostico': string | null;
  'Valor Setup': string | null;
  'Valor OXY': string | null;
  'Valor Turnaround': string | null;
  'Valor Valuation': string | null;
  'Status Relacionamento': string | null;
  'Produtos': string | null;
  'Setor': string | null;
  'ERP': string | null;
  'UF': string | null;
  'Responsavel': string | null;
  'Mes do Churn': string | null;
  'Motivo Principal do Churn': string | null;
  'Motivos cancelamento': string | null;
  'Data de assinatura do contrato': string | null;
  'Data encerramento': string | null;
  'LT (meses)': string | null;
  'Problemas com a Oxy': string | null;
}

export interface TratativaCard {
  ID: string;
  'Título': string;
  'Fase': string;
  'Fase Atual': string;
  'Entrada': string;
  'Saída': string | null;
  'Duração (s)': number | null;
  'CFO Responsavel': string | null;
  'Motivo': string | null;
  'Decisao Final': string | null;
  'Motivo Churn': string | null;
  'Satisfacao do Cliente': string | null;
  'Responsavel pela Tratativa': string | null;
}

export interface CfoClient {
  titulo: string;
  mrr: number;
  cardId: string;
  fase: string;
}

export interface CfoDistribution {
  cfo: string;
  clientes: number;
  mrr: number;
  clients: CfoClient[];
}

export interface TratativaActive {
  id: string;
  empresa: string;
  motivo: string;
  cfo: string;
  diasEmTratativa: number;
  faseAtual: string;
}

export interface SetupCard {
  ID: string;
  'Título': string;
  'Fase': string;
  'Fase Atual': string;
  'Entrada': string;
  'Saída': string | null;
  'Duração (s)': number | null;
  'CFO Responsavel': string | null;
  'Implantador Oxy': string | null;
  'Nome Empresa': string | null;
  'Nome - Interlocução O2': string | null;
  'Data Kickoff': string | null;
}

export interface SetupActive {
  id: string;
  empresa: string;
  responsavel: string;
  faseAtual: string;
  diasEmSetup: number;
  atrasado: boolean;
}

export interface SetupByErp {
  erp: string;
  mediaDias: number;
  count: number;
}

export interface RotinaCard {
  ID: string;
  'Título': string;
  'Fase': string;
  'Fase Atual': string;
  'Entrada': string;
  'Saída': string | null;
  'CFO Responsavel': string | null;
  'Overdue': boolean | string | null;
  'Data Prevista Entrega': string | null;
  'Tipo de Entrega': string | null;
  'Mes Referencia': string | null;
}

export interface RotinaAtrasada {
  id: string;
  empresa: string;
  tipoEntrega: string;
  dataPrevista: string;
  diasAtraso: number;
  faseAtual: string;
}

export interface CfoTaskSummary {
  cfo: string;
  totalAtivas: number;
  atrasadas: number;
  taxaEntrega: number;
  tarefas: RotinaAtrasada[];
}

export interface SatisfacaoDistribution {
  nota: string;
  count: number;
}

export interface ChurnDossierCard {
  id: string;
  mesChurn: string;
  cliente: string;
  setup: number;
  mrr: number;
  motivoPrincipal: string;
  motivosCancelamento: string;
  cfo: string;
  produto: string;
  faseAtual: string;
  dataAssinatura: string;
  dataEncerramento: string;
  ltMeses: string;
  problemasOxy: string;
  diagnostico: number;
}

export interface OperationsKpis {
  totalAtivos: number;
  emOnboarding: number;
  emOperacao: number;
  emTratativa: number;
  churn: number;
  mrrTotal: number;
  tratativasAtivas: number;
  emSetup: number;
  setupAtrasados: number;
  tarefasAtrasadas: number;
  churnRate: number;
  retencaoRate: number;
  mrrEmRisco: number;
}

async function fetchTableData(table: string, limit = 1000) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('query-external-db', {
    body: { table, action: 'preview', limit },
  });

  if (error) throw error;
  return data?.data || [];
}

function parseNumber(val: string | null | undefined): number {
  if (!val) return 0;
  const cleaned = String(val).replace(/[^\d.,\-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

interface NpsCard {
  ID: string;
  'Título': string;
  'Fase': string;
  'Fase Atual': string;
  'Nota NPS': string | null;
  'Motivo da Nota': string | null;
  'Comentarios': string | null;
  'Sentimento Oxy': string | null;
}

function formatMonthYear(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[d.getMonth()]}/${d.getFullYear()}`;
}

function diffInMonths(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return months > 0 ? String(months) : '';
}

function processProjects(rows: ProjectCard[], tratativas: TratativaCard[], npsRows: NpsCard[], assinaturaMap: Map<string, string>) {
  const currentPhase = rows.filter(r => r['Fase'] === r['Fase Atual']);

  const phaseCount: Record<string, number> = {};
  const cfoMapAtivos: Record<string, { clientes: number; mrr: number; clients: CfoClient[] }> = {};
  let mrrTotal = 0;
  let mrrEmRisco = 0;

  const fasesAtivas = ['Onboarding', 'Em Operação Recorrente'];

  currentPhase.forEach(card => {
    const fase = card['Fase Atual'] || 'Desconhecida';
    phaseCount[fase] = (phaseCount[fase] || 0) + 1;

    const cfo = card['CFO Responsavel'] || card['Responsavel'] || 'Sem CFO';
    const mrr = parseNumber(card['Valor CFOaaS']);

    if (fasesAtivas.includes(fase)) {
      if (!cfoMapAtivos[cfo]) cfoMapAtivos[cfo] = { clientes: 0, mrr: 0, clients: [] };
      cfoMapAtivos[cfo].clientes += 1;
      cfoMapAtivos[cfo].mrr += mrr;
      cfoMapAtivos[cfo].clients.push({
        titulo: card['Título'] || '',
        mrr,
        cardId: card.ID,
        fase,
      });
      mrrTotal += mrr;
    }

    if (fase === 'Em Tratativa') {
      mrrEmRisco += mrr;
    }
  });

  const cfoDistribution: CfoDistribution[] = Object.entries(cfoMapAtivos)
    .map(([cfo, data]) => ({ cfo, ...data }))
    .sort((a, b) => b.clientes - a.clientes);

  const totalAtivos = (phaseCount['Onboarding'] || 0) + (phaseCount['Em Operação Recorrente'] || 0);
  const churn = (phaseCount['Churn'] || 0) + (phaseCount['Atividades finalizadas'] || 0) + (phaseCount['Desistência'] || 0);
  const churnRate = (totalAtivos + churn) > 0 ? (churn / (totalAtivos + churn)) * 100 : 0;

  // Churn Dossier — cruzar com tratativas e NPS
  const churnFases = ['Churn', 'Atividades finalizadas', 'Desistência'];
  const churnCards = currentPhase.filter(c => churnFases.includes(c['Fase Atual'] || ''));

  // Mapa título → tratativa mais recente (fase atual do card na tratativa)
  const tratativaCurrentPhase = tratativas.filter(r => r['Fase'] === r['Fase Atual']);
  const tratativaMap = new Map<string, TratativaCard>();
  tratativaCurrentPhase.forEach(t => {
    const key = (t['Título'] || '').trim().toLowerCase();
    if (key) tratativaMap.set(key, t);
  });

  // Mapa título → NPS (buscar detratores ou último feedback com comentário)
  const npsCurrentPhase = npsRows.filter(r => r['Fase'] === r['Fase Atual']);
  const npsMap = new Map<string, NpsCard>();
  npsCurrentPhase.forEach(n => {
    const key = (n['Título'] || '').trim().toLowerCase();
    if (key && (n['Comentarios'] || n['Motivo da Nota'])) {
      npsMap.set(key, n);
    }
  });

  // Filtro: apenas churns a partir de Outubro/2025
  const CHURN_CUTOFF = new Date('2025-10-01').getTime();

  const churnDossier: ChurnDossierCard[] = churnCards.map(card => {
    const key = (card['Título'] || '').trim().toLowerCase();
    const trat = tratativaMap.get(key);
    const nps = npsMap.get(key);

    const dataAssinatura = assinaturaMap.get(card.ID) || card['Data de assinatura do contrato'] || '';
    const dataEncerramento = trat?.['Saída'] ? new Date(trat['Saída']).toISOString().split('T')[0] : trat?.['Entrada'] ? new Date(trat['Entrada']).toISOString().split('T')[0] : (card['Data encerramento'] || '');
    const mesChurn = trat ? formatMonthYear(trat['Entrada']) : (card['Mes do Churn'] || '');
    const ltMeses = diffInMonths(dataAssinatura, dataEncerramento) || (card['LT (meses)'] || '');

    const problemasOxy = nps?.['Comentarios'] || nps?.['Motivo da Nota'] || card['Problemas com a Oxy'] || '';

    // Determinar data de referência para filtro
    const refDate = trat?.['Entrada'] ? new Date(trat['Entrada']).getTime() : (card['Entrada'] ? new Date(card['Entrada']).getTime() : 0);

    return {
      id: card.ID,
      mesChurn,
      cliente: card['Título'] || '',
      setup: parseNumber(card['Valor Setup']),
      mrr: parseNumber(card['Valor CFOaaS']),
      motivoPrincipal: trat?.['Motivo'] || card['Motivo Principal do Churn'] || '',
      motivosCancelamento: trat?.['Motivo Churn'] || card['Motivos cancelamento'] || '',
      cfo: card['CFO Responsavel'] || card['Responsavel'] || '',
      produto: card['Produtos'] || '',
      faseAtual: card['Fase Atual'] || '',
      dataAssinatura,
      dataEncerramento,
      ltMeses,
      problemasOxy,
      diagnostico: parseNumber(card['Valor Diagnostico']),
      _refDate: refDate,
    };
  }).filter(c => c._refDate >= CHURN_CUTOFF)
    .filter(c => c.motivoPrincipal || c.dataEncerramento || c.mesChurn)
    .map(({ _refDate, ...rest }) => rest);

  return {
    phaseCount,
    cfoDistribution,
    mrrTotal,
    mrrEmRisco,
    totalCards: currentPhase.length,
    emOnboarding: phaseCount['Onboarding'] || 0,
    emOperacao: phaseCount['Em Operação Recorrente'] || 0,
    emTratativa: phaseCount['Em Tratativa'] || 0,
    churn,
    churnRate,
    retencaoRate: 100 - churnRate,
    churnDossier,
  };
}

function processTratativas(rows: TratativaCard[]) {
  const currentPhase = rows.filter(r => r['Fase'] === r['Fase Atual']);
  const now = Date.now();

  const activeFases = ['Triagem', 'Em Tratativa com CS', 'Plano de Ação (se necessário)', 'Conclusão', 'Financeiro'];
  const activeCards = currentPhase.filter(c => activeFases.includes(c['Fase Atual'] || ''));

  const tratativasAtivas: TratativaActive[] = activeCards.map(card => {
    const entrada = new Date(card['Entrada']).getTime();
    const dias = Math.max(0, Math.round((now - entrada) / 86400000));
    return {
      id: card.ID,
      empresa: card['Título'] || '',
      motivo: card['Motivo'] || 'N/A',
      cfo: card['CFO Responsavel'] || 'N/A',
      diasEmTratativa: dias,
      faseAtual: card['Fase Atual'] || '',
    };
  }).sort((a, b) => b.diasEmTratativa - a.diasEmTratativa);

  const finalizadas = currentPhase.filter(c =>
    c['Fase Atual'] === 'Tratativa finalizada' || c['Fase Atual'] === 'Arquivado'
  );
  const motivoChurnCount: Record<string, number> = {};
  const decisaoCount: Record<string, number> = {};

  finalizadas.forEach(card => {
    const motivo = card['Motivo Churn'] || 'Não informado';
    motivoChurnCount[motivo] = (motivoChurnCount[motivo] || 0) + 1;
    const decisao = card['Decisao Final'] || 'Não informada';
    decisaoCount[decisao] = (decisaoCount[decisao] || 0) + 1;
  });

  const motivoCount: Record<string, number> = {};
  currentPhase.forEach(card => {
    const motivo = card['Motivo'] || 'Não informado';
    motivoCount[motivo] = (motivoCount[motivo] || 0) + 1;
  });

  // Satisfação do Cliente nas tratativas finalizadas
  const satisfacaoCount: Record<string, number> = {};
  finalizadas.forEach(card => {
    const sat = card['Satisfacao do Cliente'];
    if (sat && sat.trim()) {
      satisfacaoCount[sat.trim()] = (satisfacaoCount[sat.trim()] || 0) + 1;
    }
  });
  const satisfacaoDistribution: SatisfacaoDistribution[] = Object.entries(satisfacaoCount)
    .map(([nota, count]) => ({ nota, count }))
    .sort((a, b) => b.count - a.count);

  return {
    tratativasAtivas,
    totalTratativas: currentPhase.length,
    ativas: activeCards.length,
    motivoChurnCount,
    decisaoCount,
    motivoCount,
    satisfacaoDistribution,
  };
}

const SETUP_TERMINAL_PHASES = ['Concluído', 'Churnou', 'Desistência', 'Arquivado', 'Arquivo'];

function processSetup(rows: SetupCard[], projetos: ProjectCard[]) {
  const currentPhase = rows.filter(r => r['Fase'] === r['Fase Atual']);
  const now = Date.now();

  const activeCards = currentPhase.filter(c => !SETUP_TERMINAL_PHASES.includes(c['Fase Atual'] || ''));

  const setupAtivos: SetupActive[] = activeCards.map(card => {
    const entrada = new Date(card['Entrada']).getTime();
    const dias = Math.max(0, Math.round((now - entrada) / 86400000));
    return {
      id: card.ID,
      empresa: card['Título'] || card['Nome Empresa'] || '',
      responsavel: card['Nome - Interlocução O2'] || card['CFO Responsavel'] || 'N/A',
      faseAtual: card['Fase Atual'] || '',
      diasEmSetup: dias,
      atrasado: dias > 90,
    };
  }).sort((a, b) => b.diasEmSetup - a.diasEmSetup);

  // Tempo médio de setup por ERP (dos concluídos)
  const erpMap = new Map<string, string>();
  projetos.forEach(p => {
    const titulo = p['Título'];
    const erp = p['ERP'];
    if (titulo && erp) erpMap.set(titulo.trim().toLowerCase(), erp.trim());
  });

  // For concluded setups, calculate total duration
  const concludedCards = currentPhase.filter(c => c['Fase Atual'] === 'Concluído');
  const erpDurations: Record<string, number[]> = {};

  concludedCards.forEach(card => {
    const titulo = (card['Título'] || card['Nome Empresa'] || '').trim().toLowerCase();
    const erp = erpMap.get(titulo) || 'Não Informado';
    
    // Use Duração (s) if available, otherwise calculate from Entrada to now
    let dias = 0;
    if (card['Duração (s)'] && card['Duração (s)'] > 0) {
      dias = Math.round(card['Duração (s)'] / 86400);
    } else {
      const entrada = new Date(card['Entrada']).getTime();
      const saida = card['Saída'] ? new Date(card['Saída']).getTime() : now;
      dias = Math.max(0, Math.round((saida - entrada) / 86400000));
    }

    if (!erpDurations[erp]) erpDurations[erp] = [];
    erpDurations[erp].push(dias);
  });

  const setupByErp: SetupByErp[] = Object.entries(erpDurations)
    .map(([erp, durations]) => ({
      erp,
      mediaDias: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      count: durations.length,
    }))
    .sort((a, b) => b.mediaDias - a.mediaDias);

  return {
    setupAtivos,
    total: currentPhase.length,
    emSetup: activeCards.length,
    setupAtrasados: setupAtivos.filter(s => s.atrasado).length,
    setupByErp,
  };
}

const ROTINA_TERMINAL_PHASES = [
  'Entregue / Concluído',
  'Concluído',
  'Cancelada',
  'Cancelado',
  'Arquivado',
  'Arquivo',
];

function processRotinas(rows: RotinaCard[], projetos: ProjectCard[]): { cfoTaskSummary: CfoTaskSummary[]; tarefasAtrasadasTotal: number } {
  const currentPhase = rows.filter(r => r['Fase'] === r['Fase Atual']);
  const activeCards = currentPhase.filter(c => !ROTINA_TERMINAL_PHASES.includes(c['Fase Atual'] || ''));
  const now = Date.now();

  // Build fallback map from projects: titulo → CFO
  const cfoFallbackMap = new Map<string, string>();
  projetos.forEach(p => {
    const titulo = (p['Título'] || '').trim().toLowerCase();
    const cfo = p['CFO Responsavel'] || p['Responsavel'];
    if (titulo && cfo) cfoFallbackMap.set(titulo, cfo);
  });

  const cfoMap: Record<string, { totalAtivas: number; atrasadas: number; tarefas: RotinaAtrasada[] }> = {};

  activeCards.forEach(card => {
    const titulo = (card['Título'] || '').trim().toLowerCase();
    const cfo = card['CFO Responsavel'] || cfoFallbackMap.get(titulo) || 'Sem CFO';
    if (!cfoMap[cfo]) cfoMap[cfo] = { totalAtivas: 0, atrasadas: 0, tarefas: [] };
    cfoMap[cfo].totalAtivas += 1;

    const isOverdue = card['Overdue'] === true || card['Overdue'] === 'true';
    const dataPrevista = card['Data Prevista Entrega'];
    const isPastDue = dataPrevista ? new Date(dataPrevista).getTime() < now : false;

    if (isOverdue || isPastDue) {
      const entrada = dataPrevista ? new Date(dataPrevista).getTime() : new Date(card['Entrada']).getTime();
      const diasAtraso = Math.max(0, Math.round((now - entrada) / 86400000));
      cfoMap[cfo].atrasadas += 1;
      cfoMap[cfo].tarefas.push({
        id: card.ID,
        empresa: card['Título'] || '',
        tipoEntrega: card['Tipo de Entrega'] || 'N/A',
        dataPrevista: dataPrevista || 'N/A',
        diasAtraso,
        faseAtual: card['Fase Atual'] || '',
      });
    }
  });

  const cfoTaskSummary: CfoTaskSummary[] = Object.entries(cfoMap)
    .map(([cfo, data]) => ({
      cfo,
      ...data,
      taxaEntrega: data.totalAtivas > 0 ? Math.round(((data.totalAtivas - data.atrasadas) / data.totalAtivas) * 100) : 100,
      tarefas: data.tarefas.sort((a, b) => b.diasAtraso - a.diasAtraso),
    }))
    .sort((a, b) => b.atrasadas - a.atrasadas);

  const tarefasAtrasadasTotal = cfoTaskSummary.reduce((sum, c) => sum + c.atrasadas, 0);

  return { cfoTaskSummary, tarefasAtrasadasTotal };
}

export function useOperationsData() {
  return useQuery({
    queryKey: ['operations-data'],
    queryFn: async () => {
      const [projetos, tratativas, setup, rotinas, npsRows, clientes, connections] = await Promise.all([
        fetchTableData('pipefy_central_projetos', 5000),
        fetchTableData('pipefy_moviment_tratativas', 5000),
        fetchTableData('pipefy_moviment_setup'),
        fetchTableData('pipefy_moviment_rotinas'),
        fetchTableData('pipefy_moviment_nps', 5000),
        fetchTableData('pipefy_db_clientes', 5000),
        fetchTableData('pipefy_card_connections', 5000),
      ]);

      // Build assinatura map: projeto card_id → data de assinatura
      const connToClient = new Map<string, string>();
      (connections as any[]).forEach((c: any) => {
        if (c['connected_pipe_name'] === 'Clientes') {
          connToClient.set(String(c['card_id']), String(c['connected_card_id']));
        }
      });
      const clienteDataMap = new Map<string, string>();
      (clientes as any[]).forEach((c: any) => {
        if (c['ID'] && c['Data de assinatura do contrato']) {
          clienteDataMap.set(String(c['ID']), c['Data de assinatura do contrato']);
        }
      });
      const assinaturaMap = new Map<string, string>();
      connToClient.forEach((clientId, cardId) => {
        const data = clienteDataMap.get(clientId);
        if (data) assinaturaMap.set(cardId, data);
      });

      const projectData = processProjects(projetos, tratativas, npsRows, assinaturaMap);
      const tratativaData = processTratativas(tratativas);
      const setupData = processSetup(setup, projetos);
      const rotinaData = processRotinas(rotinas, projetos);

      const kpis: OperationsKpis = {
        totalAtivos: projectData.emOnboarding + projectData.emOperacao,
        emOnboarding: projectData.emOnboarding,
        emOperacao: projectData.emOperacao,
        emTratativa: projectData.emTratativa,
        churn: projectData.churn,
        mrrTotal: projectData.mrrTotal,
        tratativasAtivas: tratativaData.ativas,
        emSetup: setupData.emSetup,
        setupAtrasados: setupData.setupAtrasados,
        tarefasAtrasadas: rotinaData.tarefasAtrasadasTotal,
        churnRate: projectData.churnRate,
        retencaoRate: projectData.retencaoRate,
        mrrEmRisco: projectData.mrrEmRisco,
      };

      return {
        kpis,
        cfoDistribution: projectData.cfoDistribution,
        phaseCount: projectData.phaseCount,
        tratativasAtivas: tratativaData.tratativasAtivas,
        motivoChurnCount: tratativaData.motivoChurnCount,
        decisaoCount: tratativaData.decisaoCount,
        motivoCount: tratativaData.motivoCount,
        setupAtivos: setupData.setupAtivos,
        cfoTaskSummary: rotinaData.cfoTaskSummary,
        setupByErp: setupData.setupByErp,
        satisfacaoDistribution: tratativaData.satisfacaoDistribution,
        churnDossier: projectData.churnDossier,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
