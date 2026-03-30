export interface JornadaCliente {
  id: string;
  titulo: string;
  faseAtual: string;
  cfo: string;
  produto: string;
  mrr: number;           // Recorrente: CFOaaS + OXY
  pontual: number;       // Servicos especiais: Diagnostico + Turnaround + Valuation + Educacao
  valorSetup: number;    // Implantacao (one-time)
  erp: string;
  setor: string;
  uf: string;
  dataAssinatura: Date | null;
  dataEntrada: Date;

  // Health (calculated)
  healthScore: number;
  healthLevel: 'green' | 'yellow' | 'red';

  // Setup
  setupStatus: 'sem_setup' | 'em_andamento' | 'atrasado' | 'concluido';
  setupDias: number | null;
  setupFase: string | null;

  // NPS
  ultimoNps: number | null;
  ultimoCsat: number | null;
  npsClassificacao: 'promotor' | 'neutro' | 'detrator' | null;
  dataNps: Date | null;

  // Rotinas
  tarefasAtivas: number;
  tarefasAtrasadas: number;
  taxaEntrega: number;

  // Reunioes do mes
  reunioesFeitas: number; // 0-4

  // Tratativas
  tratativaAtiva: boolean;
  tratativaMotivo: string | null;
  tratativaDias: number | null;

  // Lifecycle
  lifetimeMonths: number | null;
  diasNaFaseAtual: number;

  // Health breakdown (pts de cada componente)
  healthBreakdown: {
    nps: number;       // 0-30
    reunioes: number;  // 0-30
    tratativa: number; // 0-20
    setup: number;     // 0-20
  };
}

export interface JornadaCfo {
  nome: string;
  clientes: number;
  mrrTotal: number;
  mrrEmRisco: number;
  clientesAtivos: number;
  clientesSetup: number;
  clientesTratativa: number;
  clientesChurn: number;
  tarefasAtrasadas: number;
  taxaEntrega: number;
  npsMediaClientes: number | null;
  healthScoreMedio: number;
}

export interface JornadaAlerta {
  tipo: 'setup_atrasado' | 'tratativa_aberta' | 'tarefa_atrasada' | 'nps_detrator' | 'sem_nps' | 'churn';
  severidade: 'critico' | 'alto' | 'medio';
  cliente: string;
  clienteId: string;
  cfo: string;
  descricao: string;
  dias: number | null;
  valor: number | null;
}

export interface PipelineFase {
  fase: string;
  label: string;
  count: number;
  mrr: number;
  clientes: JornadaCliente[];
  cor: string;
}

export interface JornadaFilter {
  cfo: string[];
  produto: string[];
  healthLevel: ('green' | 'yellow' | 'red')[];
}
