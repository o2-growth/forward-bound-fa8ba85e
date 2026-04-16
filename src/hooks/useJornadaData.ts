import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JornadaCliente, JornadaCfo, JornadaAlerta, PipelineFase, JornadaFilter } from "@/components/planning/jornada/types";

function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
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

// CFO name normalization to merge duplicates
const CFO_NAME_NORMALIZE: Record<string, string> = {
  'Douglas Pinheiro Schossler': 'Douglas Schossler',
  'Gustavo Ferreira Cochlar': 'Gustavo Cochlar',
  'Luis Eduardo Dagostini': 'Eduardo D\'Agostini',
  'Rafael Marchioretto Bokorni': 'Rafael Marchioretto',
  'Adivilso Souza de Oliveira Junior': 'Oliveira',
};

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
  const { data, isLoading, error } = useQuery({
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

  const result = useMemo(() => {
    if (!data) return { clientes: [], cfos: [], alertas: [], pipeline: [], reunioes: [] as any[], allCfos: [] as string[], allProdutos: [] as string[], lastSync: null as Date | null };

    const { projetos, setup, tratativas, nps, rotinas, clientes, connections } = data;
    const now = new Date();

    // === 1. Build lookup maps ===

    // Assinatura dates from db_clientes
    const clienteAssinaturas = new Map<string, Date>();
    for (const c of clientes) {
      const id = String(c.ID || c.id || '');
      const dt = parseDate(c['Data de assinatura do contrato'] || c['Data assinatura']);
      if (id && dt) clienteAssinaturas.set(id, dt);
    }

    // Card connections: projectId → clienteId
    const projectToCliente = new Map<string, string>();
    for (const conn of connections) {
      const cardId = String(conn.card_id || '');
      const connId = String(conn.connected_card_id || '');
      const relName = (conn.relation_name || '').toLowerCase();
      if (relName.includes('cliente') || relName.includes('client')) {
        projectToCliente.set(cardId, connId);
      }
    }

    // NPS map: get latest NPS per project title (since NPS connects via title)
    const npsMap = new Map<string, { nota: number; csat: number | null; data: Date }>();
    for (const row of nps) {
      const titulo = (row['Título'] || '').trim().toLowerCase();
      const nota = parseInt(String(row['Nota NPS'] || '').replace(/\D/g, ''));
      if (!titulo || isNaN(nota)) continue;
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
    const tratativaMap = new Map<string, { motivo: string; dias: number; fase: string }>();
    for (const row of tratativas) {
      if (row['Fase'] !== row['Fase Atual']) continue;
      const titulo = (row['Título'] || '').trim().toLowerCase();
      if (!titulo) continue;
      const fase = row['Fase Atual'] || '';
      if (!TRATATIVA_ACTIVE.includes(fase)) continue;
      const entrada = parseDate(row['Entrada'] || row['Data de Inicio da Tratativa']);
      const dias = entrada ? daysBetween(entrada, now) : 0;
      const motivo = row['Motivo'] || 'Não informado';
      tratativaMap.set(titulo, { motivo, dias, fase });
    }

    // Rotinas map: per CFO aggregation
    const rotinasByCfo = new Map<string, { ativas: number; atrasadas: number }>();
    const rotinasByTitulo = new Map<string, { ativas: number; atrasadas: number }>();
    for (const row of rotinas) {
      if (row['Fase'] !== row['Fase Atual']) continue;
      const fase = row['Fase Atual'] || '';
      if (ROTINA_TERMINAL.some(t => fase.includes(t))) continue;
      const cfo = (row['CFO Responsavel'] || row['CFO responsável'] || '').trim();
      const titulo = (row['Título'] || '').trim().toLowerCase();
      const isOverdue = row['Overdue'] === true || row['Overdue'] === 'true';
      const dataPrevista = parseDate(row['Data Prevista Entrega']);
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
      const r1 = parseDate(row['Data Reuniao 1']);
      const r2 = parseDate(row['Data Reuniao 2']);
      const r3 = parseDate(row['Data Reuniao 3']);
      const r4 = parseDate(row['Data Mensal']);
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
      const cfo = CFO_NAME_NORMALIZE[rawCfo] || rawCfo;
      const produto = (row['Produtos'] || '').trim();
      // Check if product is pontual-only (no recurring component)
      const PONTUAL_ONLY_PRODUCTS = ['Diagnóstico Estratégico', 'Turnaround', 'Valuation', 'Educação', 'Educação – Dono CFO', 'Educação – Engenheiro de Negócios', 'Educação – Financeiro Raiz'];
      const produtoParts = produto.split(',').map(p => p.trim());
      const isPontualOnly = produtoParts.length > 0 && produtoParts.every(p => PONTUAL_ONLY_PRODUCTS.includes(p));

      const valorCfoaas = parseNum(row['Valor CFOaaS']);
      const valorOxy = parseNum(row['Valor OXY']);
      const valorDiagnostico = parseNum(row['Valor Diagnóstico Estratégico'] || row['Valor Diagnostico']);
      const valorTurnaround = parseNum(row['Valor Turnaround']);
      const valorValuation = parseNum(row['Valor Valuation']);
      const valorEducacao = parseNum(row['Valor Educação'] || row['Valor Educacao']);

      // If pontual-only product, CFOaaS goes to pontual (data entry error in Pipefy)
      const mrr = isPontualOnly ? 0 : (valorCfoaas + valorOxy);
      const pontual = valorDiagnostico + valorTurnaround + valorValuation + valorEducacao + (isPontualOnly ? valorCfoaas : 0);
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

      clienteMap.set(id, {
        id,
        titulo,
        faseAtual,
        cfo,
        produto,
        mrr,
        pontual,
        valorSetup: parseNum(row['Valor Setup']),
        erp: (row['ERP'] || '').trim(),
        setor: (row['Setor'] || '').trim(),
        uf: (row['UF'] || '').trim(),
        dataAssinatura,
        dataEntrada: entrada,
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
        lifetimeMonths: lifetime,
        diasNaFaseAtual: diasNaFase,
        healthBreakdown: { nps: hNps, reunioes: hReunioes, tratativa: hTratativa, setup: hSetup },
      });
    }

    const allClientes = Array.from(clienteMap.values());
    const activeClientes = allClientes.filter(c => ACTIVE_PHASES.includes(c.faseAtual));

    // === 3. Build Pipeline (active only, no churn) ===
    const pipelineMap = new Map<string, JornadaCliente[]>();
    for (const c of activeClientes) {
      if (!pipelineMap.has(c.faseAtual)) pipelineMap.set(c.faseAtual, []);
      pipelineMap.get(c.faseAtual)!.push(c);
    }

    const FASE_CONFIG: Record<string, { label: string; cor: string; order: number }> = {
      'Onboarding': { label: 'Onboarding', cor: 'hsl(210, 80%, 55%)', order: 0 },
      'Em Operação Recorrente': { label: 'Em Operação', cor: 'hsl(142, 70%, 45%)', order: 1 },
    };

    // Add tratativa as virtual phase
    const emTratativa = activeClientes.filter(c => c.tratativaAtiva);

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

    // === 4. Build CFOs (only active clients) ===
    const cfoMap = new Map<string, JornadaCfo>();
    for (const c of activeClientes) {
      if (!c.cfo) continue;
      const existing = cfoMap.get(c.cfo) || {
        nome: c.cfo,
        clientes: 0, mrrTotal: 0, mrrEmRisco: 0,
        clientesAtivos: 0, clientesSetup: 0, clientesTratativa: 0, clientesChurn: 0,
        tarefasAtrasadas: 0, taxaEntrega: 0, npsMediaClientes: null, healthScoreMedio: 0,
      };
      existing.clientes++;
      existing.clientesAtivos++;
      existing.mrrTotal += c.mrr;
      if (c.faseAtual === 'Onboarding') existing.clientesSetup++;
      if (c.tratativaAtiva) { existing.clientesTratativa++; existing.mrrEmRisco += c.mrr; }
      existing.tarefasAtrasadas += c.tarefasAtrasadas;
      cfoMap.set(c.cfo, existing);
    }

    // Calculate averages (only from active clients)
    for (const [cfo, data] of cfoMap) {
      const cfoActive = activeClientes.filter(c => c.cfo === cfo);
      data.healthScoreMedio = cfoActive.length > 0 ? Math.round(cfoActive.reduce((s, c) => s + c.healthScore, 0) / cfoActive.length) : 0;
      const withNps = cfoActive.filter(c => c.ultimoNps !== null);
      data.npsMediaClientes = withNps.length > 0 ? Math.round(withNps.reduce((s, c) => s + (c.ultimoNps || 0), 0) / withNps.length) : null;
      const rotinas = rotinasByCfo.get(cfo);
      data.taxaEntrega = rotinas && rotinas.ativas > 0 ? Math.round(((rotinas.ativas - rotinas.atrasadas) / rotinas.ativas) * 100) : 100;
    }

    const cfos = Array.from(cfoMap.values()).sort((a, b) => b.mrrTotal - a.mrrTotal);

    // === 5. Build Alertas (only active clients) ===
    const alertas: JornadaAlerta[] = [];
    for (const c of activeClientes) {
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
        .filter(c => !['Churn', 'Atividades finalizadas', 'Desistência', 'Arquivado'].includes(c.faseAtual))
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
    }> = [];

    for (const row of data.rotinas) {
      if (row['Fase'] !== row['Fase Atual']) continue;
      const tipo = row['Tipo de Entrega'] || '';
      if (tipo !== 'Reuniões com Cliente') continue;
      // NOTE: Do NOT filter out terminal phases here — completed reunions
      // contain the actual R1-R4 date data we need to display.

      reunioes.push({
        id: String(row.ID || ''),
        titulo: (row['Título'] || '').trim(),
        cfo: CFO_NAME_NORMALIZE[(row['CFO Responsavel'] || '').trim()] || (row['CFO Responsavel'] || '').trim(),
        faseAtual: row['Fase Atual'] || '',
        mesReferencia: (row['Mes Referencia'] || '').trim(),
        selecaoReuniao: row['Selecao Reuniao'] || null,
        clienteParticipou: row['Cliente Participou'] || null,
        dataPrevista: parseDate(row['Data Prevista Entrega']),
        overdue: row['Overdue'] === true || row['Overdue'] === 'true',
        r1: parseDate(row['Data Reuniao 1']),
        r2: parseDate(row['Data Reuniao 2']),
        r3: parseDate(row['Data Reuniao 3']),
        r4: parseDate(row['Data Mensal']),
        t1: row['Temperatura 1'] || null,
        t2: row['Temperatura 2'] || null,
        t3: row['Temperatura 3'] || null,
        t4: row['Temperatura Mensal'] || null,
      });
    }

    // Capture last sync timestamp from rotinas
    const lastSync = rotinas.length > 0
      ? new Date(Math.max(...rotinas.map((r: any) => new Date(r.updated_at || 0).getTime())))
      : null;

    return { clientes: allClientes, cfos, alertas, pipeline, reunioes, allCfos, allProdutos, lastSync };
  }, [data]);

  return { ...result, isLoading, error };
}
