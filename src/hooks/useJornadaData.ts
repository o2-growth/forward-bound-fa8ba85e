import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JornadaCliente, JornadaCfo, JornadaAlerta, PipelineFase, JornadaFilter } from "@/components/planning/jornada/types";
import { parsePipefyDate, parsePipefyDateOnly, parseRotinaDateOnly } from "./dateUtils";
import { useOxyFinance } from "./useOxyFinance";
import { MONTHS, type MonthType } from "./useMonetaryMetas";

function parseDate(val: string | null | undefined): Date | null {
  return parsePipefyDate(val);
}

function parseNum(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let s = String(val).replace(/[R$\s]/g, '').trim();
  if (s === '') return 0;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // BR format: 1.234,56
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    // BR format without thousands: 1234,56
    s = s.replace(',', '.');
  }
  // If only dot: already numeric format (1234.56 or 6767.0)
  return parseFloat(s) || 0;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / 86400000);
}

function monthsBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round(daysBetween(a, b) / 30.44));
}

// CFO name normalization map
const CFO_NAME_NORMALIZE: Record<string, string> = {
  'Douglas Pinheiro Schossler': 'Douglas Schossler',
  'Gustavo Ferreira Cochlar': 'Gustavo Cochlar',
  'Luis Eduardo Dagostini': "Eduardo D'Agostini",
  'Rafael Marchioretto Bokorni': 'Rafael Marchioretto',
  'Adivilso Souza de Oliveira Junior': 'Oliveira',
};

function normalizeCfoName(raw: string): string {
  const trimmed = raw.trim();
  return CFO_NAME_NORMALIZE[trimmed] || trimmed;
}

// Inactive phases for filtering
const INACTIVE_PHASES = ['Churn', 'Atividades finalizadas', 'Desistência', 'Arquivado'];

// Terminal phases for setup
const SETUP_TERMINAL = ['Concluído', 'Churnou', 'Desistência', 'Arquivado', 'Arquivo'];
// Active tratativa phases
const TRATATIVA_ACTIVE = ['Triagem', 'Em Tratativa com CS', 'Plano de Ação', 'Conclusão', 'Financeiro'];
// Terminal rotina phases
const ROTINA_TERMINAL = ['Entregue', 'Concluído', 'Cancelado', 'Cancelada', 'Arquivado', 'Arquivo', 'Entregue/Concluído'];
// Active project phases
const ACTIVE_PHASES = ['Onboarding', 'Em Operação Recorrente'];
const CHURN_PHASES = ['Churn', 'Atividades finalizadas', 'Desistência'];

async function fetchTable(table: string, limit = 2000) {
  const { data, error } = await supabase.functions.invoke('query-external-db', {
    body: { table, action: 'preview', limit },
  });
  if (error) throw error;
  return data?.data || [];
}

export function useJornadaData() {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['jornada-data'],
    queryFn: async () => {
      const [projetos, setup, tratativas, nps, rotinas, clientes, connections] = await Promise.all([
        fetchTable('pipefy_central_projetos', 2000),
        fetchTable('pipefy_moviment_setup', 2000),
        fetchTable('pipefy_moviment_tratativas', 1000),
        fetchTable('pipefy_moviment_nps', 1000),
        fetchTable('pipefy_moviment_rotinas', 2000),
        fetchTable('pipefy_db_clientes', 1000),
        fetchTable('pipefy_card_connections', 2000),
      ]);
      return { projetos, setup, tratativas, nps, rotinas, clientes, connections };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Cards ativos dos pipes dedicados (Assessoria Financeira hoje; BPO/Coordenador futuramente).
  // Usado pra enriquecer a carteira da Mari com fee mensal recorrente.
  const { data: pipesActiveData } = useQuery({
    queryKey: ['jornada-pipes-active-aggregated'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('query-external-db', {
        body: { action: 'pipes_active_aggregated' },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Receita extra de produtos OXY (Oxy + Oxy+Gênio + Oxy+Gênio+Especialista) do DRE Oxy Finance
  // — adicionada ao MRR Total do squad Pedrolo (mês calendário anterior)
  const oxyYear = new Date().getFullYear();
  const { oxyProductsByMonth } = useOxyFinance(oxyYear);

  const result = useMemo(() => {
    if (!data) return { clientes: [], cfos: [], alertas: [], pipeline: [], reunioes: [] as any[], allCfos: [] as string[], allProdutos: [] as string[], lastSync: '' };


    const { projetos, setup, tratativas, nps, rotinas, clientes, connections } = data;
    const now = new Date();

    // === 1. Build lookup maps ===

    // Assinatura dates from db_clientes
    const clienteAssinaturas = new Map<string, Date>();
    for (const c of clientes) {
      const id = String(c.ID || c.id || '');
      const dt = parsePipefyDateOnly(c['Data de assinatura do contrato'] || c['Data assinatura']);
      if (id && dt) clienteAssinaturas.set(id, dt);
    }

    // Card connections: projectId → clienteId AND projectId → products from DB Produtos
    const projectToCliente = new Map<string, string>();
    const projectToProducts = new Map<string, Set<string>>();
    for (const conn of connections) {
      const cardId = String(conn.card_id || '');
      const connId = String(conn.connected_card_id || '');
      const relName = (conn.relation_name || '').toLowerCase();
      if (relName.includes('cliente') || relName.includes('client')) {
        projectToCliente.set(cardId, connId);
      }
      // DB Produtos connections
      const pipeName = (conn.connected_pipe_name || '').toLowerCase();
      if (pipeName.includes('db produtos') || pipeName === 'db produtos') {
        const productName = (conn.connected_card_title || '').trim();
        if (cardId && productName) {
          if (!projectToProducts.has(cardId)) projectToProducts.set(cardId, new Set());
          projectToProducts.get(cardId)!.add(productName);
        }
      }
    }

    // NPS map: get latest NPS per project title (since NPS connects via title)
    const npsMap = new Map<string, { nota: number; csat: number | null; data: Date }>();
    // NPS feedback map: captura Motivo da Nota / Comentarios (mesmo de NPS sem nota)
    const npsFeedbackMap = new Map<string, string>();
    for (const row of nps) {
      const titulo = (row['Título'] || '').trim().toLowerCase();
      if (!titulo) continue;
      const motivoNota = (row['Motivo da Nota'] || '').trim();
      const comentarios = (row['Comentarios'] || row['Comentários'] || '').trim();
      const feedback = motivoNota || comentarios;
      if (feedback) npsFeedbackMap.set(titulo, feedback);

      const nota = parseInt(String(row['Nota NPS'] || '').replace(/\D/g, ''));
      if (isNaN(nota)) continue;
      const dt = parseDate(row['Entrada']) || new Date();
      const existing = npsMap.get(titulo);
      if (!existing || dt > existing.data) {
        const csatRaw = String(row['Satisfacao Geral'] || '').match(/(\d)/);
        npsMap.set(titulo, {
          nota,
          csat: csatRaw ? parseInt(csatRaw[1]) : null,
          data: dt,
        });
      }
    }

    // Setup map: latest setup per project title
    const setupMap = new Map<string, { fase: string; dias: number; concluido: boolean }>();
    for (const row of setup) {
      if (row['Fase'] !== row['Fase Atual']) continue; // current phase only
      const titulo = (row['Título'] || row['Nome Empresa'] || '').trim().toLowerCase();
      if (!titulo) continue;
      const fase = row['Fase Atual'] || '';
      const entrada = parseDate(row['Entrada']);
      const dias = entrada ? daysBetween(entrada, now) : 0;
      const concluido = SETUP_TERMINAL.includes(fase);
      setupMap.set(titulo, { fase, dias, concluido });
    }

    // Tratativas map: active tratativas per project title
    const tratativaMap = new Map<string, { motivo: string; motivoChurn: string | null; dias: number; fase: string }>();
    // All tratativas map: captures motivo from ANY tratativa (for churned clients)
    const allTratativaMap = new Map<string, { motivo: string; motivoChurn: string | null; fase: string }>();
    // Primeira tratativa por título — para medir "tempo entre levantar a mão e churn"
    const firstTratativaByTitulo = new Map<string, Date>();
    // Tratativas resolvidas com sucesso (decisão final = retomada / sucesso)
    const tratativasResolvidas: Array<{ titulo: string; cfo: string; motivo: string; decisao: string; valorIsentado: number; data: Date | null }> = [];
    // Valor isentado por tratativa (campo 'Valor Isentado finalizacao' / variantes)
    // Acumulamos por título normalizado (NFD) — pegamos o MAIOR valor encontrado em
    // qualquer linha de movimento da tratativa (o histórico costuma repetir o mesmo
    // valor em várias fases; somar duplicaria). Captura tolerante a variações de nome.
    const valorIsentadoByTitulo = new Map<string, number>();
    const readNum = (v: unknown): number => {
      if (v == null) return 0;
      const s = String(v).replace(/[^0-9.,-]/g, '').replace(/\./g, '').replace(',', '.');
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };
    const normKey = (k: string) =>
      k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const normTitulo = (t: string) =>
      (t || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const readValorIsentadoFromRow = (row: Record<string, unknown>): number => {
      for (const k of Object.keys(row)) {
        const nk = normKey(k);
        if (nk.startsWith('valorisentado')) {
          const n = readNum(row[k]);
          if (n > 0) return n / 100; // Pipefy retorna em centavos
        }
      }
      return 0;
    };
    // Pré-passagem: captura valor isentado em QUALQUER linha de movimento (não só Fase Atual)
    for (const row of tratativas) {
      const v = readValorIsentadoFromRow(row);
      if (v <= 0) continue;
      const t = normTitulo(String(row['Título'] || ''));
      if (!t) continue;
      const prev = valorIsentadoByTitulo.get(t) || 0;
      if (v > prev) valorIsentadoByTitulo.set(t, v);
    }
    const isSucessoDecisao = (d: string): boolean => {
      const s = d.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      return s.includes('sucesso') || s.includes('retomada') || s.includes('retornou') || s.includes('resolvido') || s.includes('implementada com sucesso');
    };
    for (const row of tratativas) {
      if (row['Fase'] !== row['Fase Atual']) continue;
      const titulo = (row['Título'] || '').trim().toLowerCase();
      if (!titulo) continue;
      const fase = row['Fase Atual'] || '';
      const motivoChurnTrat = (row['Motivo Churn'] || '').trim() || null;
      const motivo = (row['Motivo'] || '').trim() || 'Não informado';
      const entrada = parseDate(row['Entrada'] || row['Data de Inicio da Tratativa']);
      const dias = entrada ? daysBetween(entrada, now) : 0;
      const cfoT = normalizeCfoName((row['CFO Responsavel'] || row['Responsavel pela Tratativa'] || '').trim());

      // Tratativas finalizadas: checar decisão e valor isentado
      const decisao = (row['Decisao Final'] || '').trim();
      const solucaoSucesso = (row['Solucao Implementada com Sucesso'] || row['Solução Implementada com Sucesso'] || '').trim();
      // Valor isentado já capturado na pré-passagem (qualquer linha de movimento)
      const valorIsentado = valorIsentadoByTitulo.get(normTitulo(String(row['Título'] || ''))) || 0;
      const finalizacaoDate = parseDate(row['Saída'] || row['Saida'] || row['Data encerramento'] || row['Data de encerramento']) || entrada;
      if (decisao && (isSucessoDecisao(decisao) || /sim/i.test(solucaoSucesso))) {
        tratativasResolvidas.push({ titulo: (row['Título'] || '').trim(), cfo: cfoT, motivo, decisao, valorIsentado, data: finalizacaoDate });
      }

      // Store in all-tratativas map (latest wins)
      allTratativaMap.set(titulo, { motivo, motivoChurn: motivoChurnTrat, fase });

      // First tratativa entrada (earliest wins)
      if (entrada) {
        const prev = firstTratativaByTitulo.get(titulo);
        if (!prev || entrada < prev) firstTratativaByTitulo.set(titulo, entrada);
      }

      // Only active tratativas go into the active map
      if (!TRATATIVA_ACTIVE.includes(fase)) continue;
      tratativaMap.set(titulo, { motivo, motivoChurn: motivoChurnTrat, dias, fase });
    }

    // Data de encerramento (churn date) por título — regra oficial:
    // 1) Data encerramento (Central de Projetos) OU 2) Data do churn (campo manual) como fallback.
    const churnDateByTitulo = new Map<string, Date>();
    for (const row of projetos) {
      if (row['Fase'] !== row['Fase Atual']) continue;
      const titulo = (row['Título'] || '').trim().toLowerCase();
      if (!titulo) continue;
      const enc = parseDate(
        row['Data encerramento'] ||
        row['Data de encerramento'] ||
        row['Saída'] ||
        row['Saida'] ||
        row['Data do churn'] ||
        row['Data Churn']
      );
      if (enc) churnDateByTitulo.set(titulo, enc);
    }

    // Motivo de churn vindo direto do card central de projetos
    const projetoMotivoChurnMap = new Map<string, { principal: string | null; cancelamento: string | null; problemasOxy: string | null }>();
    for (const row of projetos) {
      if (row['Fase'] !== row['Fase Atual']) continue;
      const titulo = (row['Título'] || '').trim().toLowerCase();
      if (!titulo) continue;
      const principal = (row['Motivo Principal do Churn'] || '').trim() || null;
      const cancelamento = (row['Motivos cancelamento'] || row['Motivos Cancelamento'] || '').trim() || null;
      const problemasOxy = (row['Problemas com a Oxy'] || '').trim() || null;
      if (principal || cancelamento || problemasOxy) {
        projetoMotivoChurnMap.set(titulo, { principal, cancelamento, problemasOxy });
      }
    }

    // Overrides do dossiê Q1 (planilha fonte de verdade)
    const CHURN_OVERRIDES: Record<string, string> = {
      'zebl arquitetura eireli': 'Comercial O2',
      'aled atacadão led': 'Comercial O2',
      'cymaco engenharia': 'Atendimento O2',
      'trm energy': 'Financeiro',
      'unitac': 'Atendimento O2',
      'duog soluções em tecnologia': 'Problema na Oxy',
      'transrossi log': 'Financeiro',
      'rocha med': 'Problema na Oxy',
      'básico brasil ltda': 'Atendimento O2',
      'protectface respiradores': 'Comercial O2',
    };

    // Rotinas map: per CFO aggregation
    const rotinasByCfo = new Map<string, { ativas: number; atrasadas: number }>();
    const rotinasByTitulo = new Map<string, { ativas: number; atrasadas: number }>();
    for (const row of rotinas) {
      if (row['Fase'] !== row['Fase Atual']) continue;
      const fase = row['Fase Atual'] || '';
      if (ROTINA_TERMINAL.some(t => fase.includes(t))) continue;
      const rawCfoRotina = (row['CFO Responsavel'] || row['CFO responsável'] || '').trim();
      const cfo = normalizeCfoName(rawCfoRotina);
      const titulo = (row['Título'] || '').trim().toLowerCase();
      const isOverdue = row['Overdue'] === true || row['Overdue'] === 'true';
      const dataPrevista = parseRotinaDateOnly(row['Data Prevista Entrega']);
      const atrasada = isOverdue || (dataPrevista && dataPrevista < now);

      if (cfo) {
        const existing = rotinasByCfo.get(cfo) || { ativas: 0, atrasadas: 0 };
        existing.ativas++;
        if (atrasada) existing.atrasadas++;
        rotinasByCfo.set(cfo, existing);
      }
      if (titulo) {
        const existing = rotinasByTitulo.get(titulo) || { ativas: 0, atrasadas: 0 };
        existing.ativas++;
        if (atrasada) existing.atrasadas++;
        rotinasByTitulo.set(titulo, existing);
      }
    }

    // Reunioes by titulo (count done reunions per client for current month)
    const reunioesByTitulo = new Map<string, { feitas: number }>();
    for (const row of data.rotinas) {
      if (row['Fase'] !== row['Fase Atual']) continue;
      if ((row['Tipo de Entrega'] || '') !== 'Reuniões com Cliente') continue;
      if (ROTINA_TERMINAL.some(t => (row['Fase Atual'] || '').includes(t))) continue;
      const mesRef = (row['Mes Referencia'] || '').trim();
      // Current month check
      const currentMonthNames = [
        `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][now.getMonth()]}/${now.getFullYear()}`,
        `${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][now.getMonth()]}/${now.getFullYear()}`
      ];
      if (!currentMonthNames.some(m => mesRef.includes(m.substring(0, 3)))) continue;

      const titulo = (row['Título'] || '').trim().toLowerCase();
      if (!titulo) continue;
      // Sync do Pipefy foi corrigido — datas vêm corretas, sem swap DD↔MM.
      const r1 = parseRotinaDateOnly(row['Data Reuniao 1']);
      const r2 = parseRotinaDateOnly(row['Data Reuniao 2']);
      const r3 = parseRotinaDateOnly(row['Data Reuniao 3']);
      const r4 = parseRotinaDateOnly(row['Data Mensal']);
      const feitas = [r1, r2, r3, r4].filter(d => d !== null).length;
      reunioesByTitulo.set(titulo, { feitas });
    }

    // === 2. Build JornadaCliente[] ===
    const clienteMap = new Map<string, JornadaCliente>();

    for (const row of projetos) {
      if (row['Fase'] !== row['Fase Atual']) continue;
      const id = String(row.ID || '');
      if (!id || clienteMap.has(id)) continue;

      const titulo = (row['Título'] || '').trim();
      const tituloLower = titulo.toLowerCase();
      const faseAtual = row['Fase Atual'] || '';
      const rawCfo = (row['CFO Responsavel'] || row['Responsavel'] || '').trim();
      const cfo = normalizeCfoName(rawCfo);
      // Products from DB Produtos connections (preferred) or fallback to text field
      const dbProdutos = projectToProducts.get(id);
      const produto = dbProdutos && dbProdutos.size > 0
        ? [...dbProdutos].join(', ')
        : (row['Produtos'] || '').trim();
      // Check if product is pontual-only (no recurring component)
      const PONTUAL_ONLY_PRODUCTS = ['Diagnóstico Estratégico', 'Diagnóstico', 'Turnaround', 'Valuation', 'Educação', 'Educação – Dono CFO', 'Educação – Engenheiro de Negócios', 'Educação – Financeiro Raiz'];
      const produtoParts = dbProdutos && dbProdutos.size > 0
        ? [...dbProdutos]
        : produto.split(',').map(p => p.trim());
      const isPontualOnly = produtoParts.length > 0 && produtoParts.every(p => PONTUAL_ONLY_PRODUCTS.includes(p));

      const valorCfoaas = parseNum(row['Valor CFOaaS']);
      const valorOxy = parseNum(row['Valor OXY']);
      const valorDiagnostico = parseNum(row['Valor Diagnóstico Estratégico'] || row['Valor Diagnostico'] || row['Valor Diagnóstico'] || row['Valor Setup']);
      const valorTurnaround = parseNum(row['Valor Turnaround']);
      const valorValuation = parseNum(row['Valor Valuation']);
      const valorEducacao = parseNum(row['Valor Educação'] || row['Valor Educacao']);

      // If pontual-only product, CFOaaS goes to pontual (data entry error in Pipefy)
      let mrr = isPontualOnly ? 0 : (valorCfoaas + valorOxy);
      let pontual = valorDiagnostico + valorTurnaround + valorValuation + valorEducacao + (isPontualOnly ? valorCfoaas : 0);

      // Override específico (Dago): valor lançado como pontual é, na verdade, recorrente (MRR)
      const PONTUAL_TO_MRR_OVERRIDES = ['libracom', 'rgo'];
      if (PONTUAL_TO_MRR_OVERRIDES.some(k => tituloLower.includes(k))) {
        mrr = mrr + pontual;
        pontual = 0;
      }
      // Override de MRR fixo (Dago): Guará entrou como 30k mas o real é 15k recorrente
      const MRR_FIXED_OVERRIDES: Record<string, number> = {
        'guará': 15000,
        'guara': 15000,
      };
      const guaraKey = Object.keys(MRR_FIXED_OVERRIDES).find(k => tituloLower.includes(k));
      if (guaraKey) {
        mrr = MRR_FIXED_OVERRIDES[guaraKey];
        pontual = 0;
      }
      const entrada = parseDate(row['Entrada']) || new Date();
      const diasNaFase = daysBetween(entrada, now);

      // Assinatura from connected cliente
      const clienteId = projectToCliente.get(id);
      const dataAssinatura = clienteId ? clienteAssinaturas.get(clienteId) : null;
      const lifetime = dataAssinatura ? monthsBetween(dataAssinatura, now) : null;

      // NPS
      const npsData = npsMap.get(tituloLower);
      const ultimoNps = npsData?.nota ?? null;
      const ultimoCsat = npsData?.csat ?? null;
      const npsClass = ultimoNps === null ? null : ultimoNps >= 9 ? 'promotor' as const : ultimoNps >= 7 ? 'neutro' as const : 'detrator' as const;

      // Setup
      const setupData = setupMap.get(tituloLower);
      let setupStatus: JornadaCliente['setupStatus'] = 'sem_setup';
      if (setupData) {
        if (setupData.concluido) setupStatus = 'concluido';
        else if (setupData.dias > 90) setupStatus = 'atrasado';
        else setupStatus = 'em_andamento';
      }

      // Rotinas
      const rotinasData = rotinasByTitulo.get(tituloLower) || { ativas: 0, atrasadas: 0 };
      const taxaEntrega = rotinasData.ativas > 0 ? Math.round(((rotinasData.ativas - rotinasData.atrasadas) / rotinasData.ativas) * 100) : 100;

      // Tratativa
      const tratData = tratativaMap.get(tituloLower);

      // Reunioes do mes (from rotinas - Reunioes com Cliente)
      const reuniaoData = reunioesByTitulo.get(tituloLower);
      const reunioesFeitas = reuniaoData?.feitas ?? 0;

      // === Health Score ===
      // NPS (30 pts)
      const hNps = npsClass === 'promotor' ? 30 : npsClass === 'neutro' ? 18 : npsClass === 'detrator' ? 5 : 12;
      // Reunioes do mes (30 pts)
      const hReunioes = Math.round((reunioesFeitas / 4) * 30);
      // Tratativa (20 pts)
      const hTratativa = !tratData ? 20 : tratData.dias <= 30 ? 8 : 2;
      // Setup (20 pts)
      // Setup: so penaliza se atrasado (>90d). Em andamento no prazo = nota maxima
      const hSetup = setupStatus === 'atrasado' ? 3 : 20;

      const health = hNps + hReunioes + hTratativa + hSetup;

      const healthLevel = health >= 70 ? 'green' as const : health >= 40 ? 'yellow' as const : 'red' as const;

      // Churn motivo — hierarquia completa (várias fontes no Pipefy):
      // 1) Override manual do dossiê Q1 (planilha fonte de verdade)
      // 2) tratativa ativa - Motivo Churn
      // 3) qualquer tratativa - Motivo Churn
      // 4) tratativa ativa - Motivo
      // 5) qualquer tratativa - Motivo
      // 6) central_projetos - Motivo Principal do Churn
      // 7) central_projetos - Motivos cancelamento
      // 8) central_projetos - Problemas com a Oxy
      // 9) NPS - Motivo da Nota / Comentarios
      const allTratData = allTratativaMap.get(tituloLower);
      const projMotivos = projetoMotivoChurnMap.get(tituloLower);
      const npsFeedback = npsFeedbackMap.get(tituloLower);
      const override = CHURN_OVERRIDES[tituloLower];
      const motivoChurn =
        override ??
        tratData?.motivoChurn ??
        allTratData?.motivoChurn ??
        (tratData?.motivo && tratData.motivo !== 'Não informado' ? tratData.motivo : null) ??
        (allTratData?.motivo && allTratData.motivo !== 'Não informado' ? allTratData.motivo : null) ??
        projMotivos?.principal ??
        projMotivos?.cancelamento ??
        projMotivos?.problemasOxy ??
        npsFeedback ??
        null;

      clienteMap.set(id, {
        id,
        titulo,
        faseAtual,
        cfo,
        produto,
        mrr,
        valorOxy,
        produtos: produtoParts,
        pontual,
        valorSetup: parseNum(row['Valor Setup']),
        erp: (row['ERP'] || '').trim(),
        setor: (row['Setor'] || '').trim(),
        uf: (row['UF'] || '').trim(),
        dataAssinatura,
        dataEntrada: entrada,
        dataChurnOficial: churnDateByTitulo.get(tituloLower) ?? null,
        healthScore: health,
        healthLevel,
        setupStatus,
        setupDias: setupData?.dias ?? null,
        setupFase: setupData?.fase ?? null,
        ultimoNps,
        ultimoCsat,
        npsClassificacao: npsClass,
        dataNps: npsData?.data ?? null,
        tarefasAtivas: rotinasData.ativas,
        tarefasAtrasadas: rotinasData.atrasadas,
        taxaEntrega,
        reunioesFeitas,
        tratativaAtiva: !!tratData,
        tratativaMotivo: tratData?.motivo ?? null,
        tratativaDias: tratData?.dias ?? null,
        motivoChurn,
        lifetimeMonths: lifetime,
        diasNaFaseAtual: diasNaFase,
        healthBreakdown: { nps: hNps, reunioes: hReunioes, tratativa: hTratativa, setup: hSetup },
      });
    }

    const allClientes = Array.from(clienteMap.values());

    // === 2.5 Clones virtuais para o squad Pedrolo ===
    // Clientes Pipefy que possuem produtos OXY / OXY + Gênio / OXY + Gênio + Especialista
    // são duplicados (com cfo forçado p/ Pedrolo e id sufixado) para aparecerem na carteira
    // do squad sem alterar o card original. Recorte temporal (assinatura no mês passado)
    // é aplicado adiante junto com a regra existente do Pedrolo.
    const normalizeProd = (s: string) =>
      (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const OXY_PRODUCT_NAMES = ['oxy', 'oxy + genio', 'oxy + genio + especialista'];
    const hasOxyProduct = (parts: string[]) =>
      parts.some(p => OXY_PRODUCT_NAMES.includes(normalizeProd(p)));
    const pedroloClones: typeof allClientes = [];
    for (const c of allClientes) {
      if (!hasOxyProduct(c.produtos || [])) continue;
      if ((c.cfo ?? '').includes('Pedrolo')) continue; // já é Pedrolo
      pedroloClones.push({ ...c, id: `${c.id}__pedrolo`, cfo: 'Eduardo Milani Pedrolo' });
    }
    if (pedroloClones.length > 0) {
      allClientes.push(...pedroloClones);
    }

    const activeClientes = allClientes.filter(c => ACTIVE_PHASES.includes(c.faseAtual));

    // === 3. Build Pipeline (active only, no churn) — exclui clones do Pedrolo p/ não duplicar
    const pipelineMap = new Map<string, JornadaCliente[]>();
    for (const c of activeClientes) {
      if (c.id.endsWith('__pedrolo')) continue;
      if (!pipelineMap.has(c.faseAtual)) pipelineMap.set(c.faseAtual, []);
      pipelineMap.get(c.faseAtual)!.push(c);
    }

    const FASE_CONFIG: Record<string, { label: string; cor: string; order: number }> = {
      'Onboarding': { label: 'Onboarding', cor: 'hsl(210, 80%, 55%)', order: 0 },
      'Em Operação Recorrente': { label: 'Em Operação', cor: 'hsl(142, 70%, 45%)', order: 1 },
    };

    // Add tratativa as virtual phase
    const emTratativa = activeClientes.filter(c => c.tratativaAtiva && !c.id.endsWith('__pedrolo'));

    const pipeline: PipelineFase[] = [
      ...Array.from(pipelineMap.entries())
        .filter(([fase]) => FASE_CONFIG[fase])
        .map(([fase, cls]) => ({
          fase,
          label: FASE_CONFIG[fase]?.label || fase,
          count: cls.length,
          mrr: cls.reduce((s, c) => s + c.mrr, 0),
          clientes: cls,
          cor: FASE_CONFIG[fase]?.cor || 'hsl(0, 0%, 50%)',
        })),
      {
        fase: 'Em Tratativa',
        label: 'Em Tratativa',
        count: emTratativa.length,
        mrr: emTratativa.reduce((s, c) => s + c.mrr, 0),
        clientes: emTratativa,
        cor: 'hsl(38, 90%, 50%)',
      },
    ].sort((a, b) => {
      const oa = FASE_CONFIG[a.fase]?.order ?? 2;
      const ob = FASE_CONFIG[b.fase]?.order ?? 2;
      return oa - ob;
    });

    // === 4. Build CFOs (carteira = todos os não-terminais; tratativa segue na carteira) ===
    // Carteira do CFO inclui Onboarding, Em Operação Recorrente E qualquer fase de tratativa
    // (Triagem, Em Tratativa com CS, Plano de Ação, Conclusão, Financeiro), pois o CFO continua atendendo.
    // Exclui apenas terminais: Churn, Atividades finalizadas, Desistência, Arquivado.
    //
    // Regra Mariana e Pedrolo: carteira filtrada por assinatura no MÊS PASSADO
    // (mês calendário anterior ao atual). Cliente "expira" da carteira virando o mês.
    // - Mariana: serviços pontuais (Diagnóstico, Turnaround, Valuation)
    // - Pedrolo: setup + SaaS Oxy do mês anterior
    const mesAnteriorStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const mesAnteriorEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const isMariClient = (cfo: string | null | undefined) => (cfo ?? '').includes('Mariana');
    const isPedroloClient = (cfo: string | null | undefined) => (cfo ?? '').includes('Pedrolo');
    const isAssinaturaNoMesPassado = (dt: Date | null) =>
      !!dt && dt >= mesAnteriorStart && dt < mesAnteriorEnd;

    const carteiraClientes = allClientes.filter(c => {
      if (INACTIVE_PHASES.includes(c.faseAtual)) return false;
      if (isMariClient(c.cfo) || isPedroloClient(c.cfo)) {
        return isAssinaturaNoMesPassado(c.dataAssinatura);
      }
      return true;
    });

    const cfoMap = new Map<string, JornadaCfo>();
    for (const c of carteiraClientes) {
      if (!c.cfo) continue;
      const existing = cfoMap.get(c.cfo) || {
        nome: c.cfo,
        clientes: 0, mrrTotal: 0, mrrEmRisco: 0,
        clientesAtivos: 0, clientesSetup: 0, clientesTratativa: 0, clientesChurn: 0,
        tarefasAtrasadas: 0, taxaEntrega: 0, npsMediaClientes: null, healthScoreMedio: 0,
      };
      existing.clientes++;
      if (ACTIVE_PHASES.includes(c.faseAtual)) existing.clientesAtivos++;
      // Receita para o agregado do CFO (não altera dados dos clientes nem outras telas):
      // - Mariana: pontual conta como MRR (serviços especiais)
      // - Pedrolo: substitui MRR padrão por valorSetup + valorOxy (setup + SaaS do mês anterior)
      // - Demais: MRR padrão (CFOaaS + Oxy)
      let receitaCliente: number;
      if (isPedroloClient(c.cfo)) {
        receitaCliente = (c.valorSetup ?? 0) + (c.valorOxy ?? 0);
      } else if (isMariClient(c.cfo)) {
        receitaCliente = c.mrr + (c.pontual ?? 0);
      } else {
        receitaCliente = c.mrr;
      }
      existing.mrrTotal += receitaCliente;
      if (c.faseAtual === 'Onboarding') existing.clientesSetup++;
      if (c.tratativaAtiva) { existing.clientesTratativa++; existing.mrrEmRisco += receitaCliente; }
      existing.tarefasAtrasadas += c.tarefasAtrasadas;
      cfoMap.set(c.cfo, existing);
    }

    // Count churns per CFO (from all clients, not just active)
    allClientes.filter(c => CHURN_PHASES.includes(c.faseAtual)).forEach(c => {
      if (!c.cfo) return;
      const existing = cfoMap.get(c.cfo);
      if (existing) {
        existing.clientesChurn++;
      }
    });

    // Calculate averages (from carteira)
    for (const [cfo, data] of cfoMap) {
      const cfoCarteira = carteiraClientes.filter(c => c.cfo === cfo);
      data.healthScoreMedio = cfoCarteira.length > 0 ? Math.round(cfoCarteira.reduce((s, c) => s + c.healthScore, 0) / cfoCarteira.length) : 0;
      const withNps = cfoCarteira.filter(c => c.npsClassificacao !== null);
      if (withNps.length > 0) {
        const promotores = withNps.filter(c => c.npsClassificacao === 'promotor').length;
        const detratores = withNps.filter(c => c.npsClassificacao === 'detrator').length;
        data.npsMediaClientes = Math.round(((promotores - detratores) / withNps.length) * 100);
      } else {
        data.npsMediaClientes = null;
      }
      const rotinas = rotinasByCfo.get(cfo);
      data.taxaEntrega = rotinas && rotinas.ativas > 0 ? Math.round(((rotinas.ativas - rotinas.atrasadas) / rotinas.ativas) * 100) : 100;
    }

    // Adiciona ao MRR Total do squad Pedrolo o faturamento dos produtos OXY
    // (Oxy + Oxy+Gênio + Oxy+Gênio+Especialista) do DRE — mês calendário anterior.
    const mesAnteriorIdx = mesAnteriorStart.getMonth();
    const mesAnteriorName = MONTHS[mesAnteriorIdx] as MonthType | undefined;
    const oxyExtra = mesAnteriorName ? Number(oxyProductsByMonth?.[mesAnteriorName] || 0) : 0;
    if (oxyExtra > 0) {
      let pedroloEntry: JornadaCfo | undefined;
      for (const [nome, entry] of cfoMap) {
        if (nome.includes('Pedrolo')) { pedroloEntry = entry; break; }
      }
      if (!pedroloEntry) {
        pedroloEntry = {
          nome: 'Eduardo Milani Pedrolo',
          clientes: 0, mrrTotal: 0, mrrEmRisco: 0,
          clientesAtivos: 0, clientesSetup: 0, clientesTratativa: 0, clientesChurn: 0,
          tarefasAtrasadas: 0, taxaEntrega: 100, npsMediaClientes: null, healthScoreMedio: 0,
        };
        cfoMap.set('Eduardo Milani Pedrolo', pedroloEntry);
      }
      pedroloEntry.mrrTotal += oxyExtra;
    }

    const cfos = Array.from(cfoMap.values()).sort((a, b) => b.mrrTotal - a.mrrTotal);

    // === 5. Build Alertas (carteira inteira; tratativa continua sendo atendida) ===
    const alertas: JornadaAlerta[] = [];
    for (const c of carteiraClientes) {
      if (c.id.endsWith('__pedrolo')) continue; // alertas vêm do card original, evita duplicar
      if (c.setupStatus === 'atrasado') {
        alertas.push({ tipo: 'setup_atrasado', severidade: 'critico', cliente: c.titulo, clienteId: c.id, cfo: c.cfo, descricao: `Setup há ${c.setupDias} dias (fase: ${c.setupFase})`, dias: c.setupDias, valor: c.mrr });
      }
      if (c.tratativaAtiva && c.tratativaDias && c.tratativaDias > 30) {
        alertas.push({ tipo: 'tratativa_aberta', severidade: 'critico', cliente: c.titulo, clienteId: c.id, cfo: c.cfo, descricao: `Tratativa aberta há ${c.tratativaDias}d: ${c.tratativaMotivo}`, dias: c.tratativaDias, valor: c.mrr });
      } else if (c.tratativaAtiva) {
        alertas.push({ tipo: 'tratativa_aberta', severidade: 'alto', cliente: c.titulo, clienteId: c.id, cfo: c.cfo, descricao: `Tratativa: ${c.tratativaMotivo} (${c.tratativaDias}d)`, dias: c.tratativaDias, valor: c.mrr });
      }
      if (c.npsClassificacao === 'detrator') {
        alertas.push({ tipo: 'nps_detrator', severidade: 'alto', cliente: c.titulo, clienteId: c.id, cfo: c.cfo, descricao: `NPS ${c.ultimoNps} (Detrator)`, dias: null, valor: c.mrr });
      }
      if (c.tarefasAtrasadas > 3) {
        alertas.push({ tipo: 'tarefa_atrasada', severidade: 'alto', cliente: c.titulo, clienteId: c.id, cfo: c.cfo, descricao: `${c.tarefasAtrasadas} tarefas atrasadas`, dias: null, valor: c.mrr });
      }
      if (!c.dataNps && c.lifetimeMonths && c.lifetimeMonths > 3) {
        alertas.push({ tipo: 'sem_nps', severidade: 'medio', cliente: c.titulo, clienteId: c.id, cfo: c.cfo, descricao: `Sem NPS registrado (${c.lifetimeMonths} meses de cliente)`, dias: null, valor: c.mrr });
      }
    }
    alertas.sort((a, b) => {
      const sev = { critico: 0, alto: 1, medio: 2 };
      return sev[a.severidade] - sev[b.severidade] || (b.valor || 0) - (a.valor || 0);
    });

    const allCfos = [...new Set(
      allClientes
        .filter(c => !INACTIVE_PHASES.includes(c.faseAtual))
        .map(c => c.cfo)
        .filter(Boolean)
    )].sort();
    const allProdutos = [...new Set(allClientes.map(c => c.produto).filter(Boolean))].sort();

    // === 6. Build Reunioes ===
    const reunioes: Array<{
      id: string; titulo: string; cfo: string; faseAtual: string;
      mesReferencia: string; selecaoReuniao: string | null; clienteParticipou: string | null;
      dataPrevista: Date | null; overdue: boolean;
      r1: Date | null; r2: Date | null; r3: Date | null; r4: Date | null;
      t1: string | null; t2: string | null; t3: string | null; t4: string | null;
      p1: string | null; p2: string | null; p3: string | null; p4: string | null;
      ata1: string | null; ata2: string | null; ata3: string | null; ata4: string | null;
    }> = [];

    const seenReunionIds = new Set<string>();

    for (const row of data.rotinas) {
      if (row['Fase'] !== row['Fase Atual']) continue;
      const tipo = row['Tipo de Entrega'] || '';
      if (tipo !== 'Reuniões com Cliente') continue;
      const faseRotina = row['Fase Atual'] || '';
      // Only exclude truly cancelled/archived — keep "Entregue"/"Concluído" as they have R1-R4 dates filled
      const REUNIAO_EXCLUDE = ['Cancelado', 'Cancelada', 'Arquivado', 'Arquivo'];
      if (REUNIAO_EXCLUDE.some(t => faseRotina.includes(t))) continue;

      // Dedup by card ID
      const reunionId = String(row.ID || '');
      if (seenReunionIds.has(reunionId)) continue;
      seenReunionIds.add(reunionId);

      reunioes.push({
        id: String(row.ID || ''),
        titulo: (row['Título'] || '').trim(),
        cfo: normalizeCfoName((row['CFO Responsavel'] || '').trim()),
        faseAtual: row['Fase Atual'] || '',
        mesReferencia: (row['Mes Referencia'] || '').trim(),
        selecaoReuniao: row['Selecao Reuniao'] || null,
        clienteParticipou: row['cliente'] || row['Cliente Participou'] || null,
        dataPrevista: parseRotinaDateOnly(row['Data Prevista Entrega']),
        overdue: row['Overdue'] === true || row['Overdue'] === 'true',
        r1: parseRotinaDateOnly(row['Data Reuniao 1']),
        r2: parseRotinaDateOnly(row['Data Reuniao 2']),
        r3: parseRotinaDateOnly(row['Data Reuniao 3']),
        r4: parseRotinaDateOnly(row['Data Mensal']),
        t1: row['Temperatura 1'] || null,
        t2: row['Temperatura 2'] || null,
        t3: row['Temperatura 3'] || null,
        t4: row['Temperatura Mensal'] || null,
        p1: row['cliente'] || row['Cliente Participou'] || null,
        p2: row['participou2'] || null,
        p3: row['participou3'] || null,
        p4: row['participoum'] || null,
        ata1: row['ata1'] || null,
        ata2: row['ata2'] || null,
        ata3: row['ata3'] || null,
        ata4: row['atam'] || null,
      });
    }

    // Find latest updated_at from rotinas
    const lastSync = rotinas.length > 0
      ? rotinas.reduce((max, r) => {
          const d = r.updated_at || r['updated_at'] || '';
          return d > max ? d : max;
        }, '')
      : '';

    // === 7. Operação: agregados especiais ===
    const normMotivo = (s: string | null | undefined) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Churns com Problemas com a Oxy (vindos do central_projetos)
    // Restrito a churns com data de encerramento (para casar com filtro do dossiê)
    const churnsOxy: Array<{ titulo: string; cfo: string; motivo: string; mrr: number; data: Date | null }> = [];
    for (const c of allClientes) {
      if (c.id.endsWith('__pedrolo')) continue;
      if (!INACTIVE_PHASES.includes(c.faseAtual)) continue;
      const churnDate = churnDateByTitulo.get(c.titulo.toLowerCase()) || null;
      if (!churnDate) continue;
      const proj = projetoMotivoChurnMap.get(c.titulo.toLowerCase());
      const motivo = c.motivoChurn || '';
      const hasOxy = !!proj?.problemasOxy
        || /oxy/i.test(motivo)
        || /oxy/i.test(proj?.principal || '')
        || /oxy/i.test(proj?.cancelamento || '');
      if (hasOxy) {
        churnsOxy.push({ titulo: c.titulo, cfo: c.cfo, motivo: proj?.problemasOxy || motivo || 'Problema na Oxy', mrr: c.mrr, data: churnDate });
      }
    }

    // Valor isentado (Atendimento O2): apenas churns do período cujo motivo é "Atendimento O2"
    const isentamentos: Array<{ titulo: string; cfo: string; motivoChurn: string | null; valor: number; data: Date | null }> = [];
    for (const c of allClientes) {
      if (c.id.endsWith('__pedrolo')) continue;
      if (!INACTIVE_PHASES.includes(c.faseAtual)) continue;
      if (normMotivo(c.motivoChurn) !== 'atendimento o2') continue;
      const churnDate = churnDateByTitulo.get(c.titulo.toLowerCase()) || null;
      if (!churnDate) continue;
      const valor = valorIsentadoByTitulo.get(normTitulo(c.titulo)) || 0;
      isentamentos.push({
        titulo: c.titulo,
        cfo: c.cfo,
        motivoChurn: c.motivoChurn,
        valor,
        data: churnDate,
      });
    }

    // Diagnóstico temporário — valores isentados capturados
    if (typeof window !== 'undefined') {
      const all = Array.from(valorIsentadoByTitulo.entries()).filter(([, v]) => v > 0);
      console.log('[isentado/diag]', {
        totalComValor: all.length,
        amostra: all.slice(0, 20),
        amora: valorIsentadoByTitulo.get(normTitulo('Amora Distribuidora')) || 0,
        grupoImagem: valorIsentadoByTitulo.get(normTitulo('Grupo imagem')) || 0,
        fiagro: valorIsentadoByTitulo.get(normTitulo('Fiagro')) || 0,
      });
    }

    // Tempo entre levantar a mão (1ª tratativa) e churn
    // Universo: TODAS as tratativas com 1ª entrada registrada.
    // Se cliente já virou churn → entra na média/mediana.
    // Se ainda não virou → aparece como "em andamento" (não conta na média).
    const clienteByTituloLower = new Map<string, typeof allClientes[number]>();
    for (const c of allClientes) clienteByTituloLower.set(c.titulo.toLowerCase(), c);

    const tempoTratativaChurn: Array<{
      titulo: string;
      cfo: string;
      diasAteChurn: number;
      motivo: string;
      status: 'churn' | 'ongoing';
      data: Date | null;
    }> = [];

    for (const [tituloLower, tratativaDate] of firstTratativaByTitulo) {
      const cliente = clienteByTituloLower.get(tituloLower);
      if (!cliente) continue;
      if (cliente.id.endsWith('__pedrolo')) continue;

      const isChurn = INACTIVE_PHASES.includes(cliente.faseAtual);
      const churnDate = churnDateByTitulo.get(tituloLower);

      if (isChurn && churnDate) {
        const dias = daysBetween(tratativaDate, churnDate);
        if (dias < 0 || dias > 730) continue;
        tempoTratativaChurn.push({
          titulo: cliente.titulo,
          cfo: cliente.cfo,
          diasAteChurn: dias,
          motivo: cliente.motivoChurn || '—',
          status: 'churn',
          data: tratativaDate,
        });
      } else {
        const dias = daysBetween(tratativaDate, now);
        if (dias < 0 || dias > 730) continue;
        tempoTratativaChurn.push({
          titulo: cliente.titulo,
          cfo: cliente.cfo,
          diasAteChurn: dias,
          motivo: 'Em andamento',
          status: 'ongoing',
          data: tratativaDate,
        });
      }
    }

    const churnsList = tempoTratativaChurn.filter(t => t.status === 'churn');
    const tempoMedioTratativaChurn = churnsList.length > 0
      ? Math.round(churnsList.reduce((s, t) => s + t.diasAteChurn, 0) / churnsList.length)
      : 0;
    const tempoMedianoTratativaChurn = churnsList.length > 0
      ? (() => {
          const sorted = [...churnsList].sort((a, b) => a.diasAteChurn - b.diasAteChurn);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 === 0
            ? Math.round((sorted[mid - 1].diasAteChurn + sorted[mid].diasAteChurn) / 2)
            : sorted[mid].diasAteChurn;
        })()
      : 0;

    const operacao = {
      tratativasResolvidas,
      tratativasResolvidasCount: tratativasResolvidas.length,
      isentamentos,
      valorIsentadoTotal: isentamentos.reduce((s, i) => s + i.valor, 0),
      tempoTratativaChurn,
      tempoMedioTratativaChurn,
      tempoMedianoTratativaChurn,
      churnsOxy,
      churnsOxyCount: churnsOxy.length,
    };

    return { clientes: allClientes, cfos, alertas, pipeline, reunioes, allCfos, allProdutos, lastSync, operacao };
  }, [data, oxyProductsByMonth]);

  return { ...result, isLoading, error, refetch, isFetching, dataUpdatedAt };
}
