// Dados hardcoded Q4 2025 - preparado para substituir por useNpsData() hook futuramente

export interface CfoPerformance {
  name: string;
  enviados: number;
  respostas: number;
  taxaResposta: number;
  nps: number;
  csat: number;
  seanEllis: number | null;
}

export interface FeedbackItem {
  quote: string;
  npsScore: number;
  sentiment: 'Positivo' | 'Neutro' | 'Negativo';
}

export const NPS_GENERAL = {
  clientesPesquisados: 66,
  respostas: 22,
  taxaResposta: 33,
  cfosAtivos: 7,
};

export const NPS_METRICS = {
  nps: { score: 36, label: 'Bom', meta: 40, metaAtingida: false },
  csat: { score: 82, meta: 80, metaAtingida: true },
  seanEllis: { score: 14, meta: 40, metaAtingida: false },
  taxaResposta: { score: 33, meta: 40 },
};

export const NPS_DISTRIBUTION = {
  promotores: { count: 12, pct: 55, label: 'notas 9-10' },
  neutros: { count: 6, pct: 27, label: 'notas 7-8' },
  detratores: { count: 4, pct: 18, label: 'notas 0-6' },
};

export const CSAT_DISTRIBUTION = {
  satisfeitos: { pct: 82, count: 18 },
  neutros: { pct: 9, count: 2 },
  insatisfeitos: { pct: 9, count: 2 },
  breakdown: [
    { label: 'Muito Satisfeito', nota: 5, count: 6 },
    { label: 'Satisfeito', nota: 4, count: 12 },
    { label: 'Neutro', nota: 3, count: 2 },
    { label: 'Insatisfeito', nota: 2, count: 2 },
    { label: 'Muito Insatisfeito', nota: 1, count: 0 },
  ],
};

export const SEAN_ELLIS_DISTRIBUTION = [
  { label: 'Muito desapontado', count: 2, color: 'bg-green-500' },
  { label: 'De certa forma desapontado', count: 8, color: 'bg-amber-500' },
  { label: 'Não ficaria desapontado', count: 4, color: 'bg-red-500' },
];

export const CFO_PERFORMANCE: CfoPerformance[] = [
  { name: 'Douglas Pinheiro Schossler', enviados: 9, respostas: 2, taxaResposta: 22, nps: 100, csat: 100, seanEllis: 0 },
  { name: 'Adivilso Souza de Oliveira Junior', enviados: 8, respostas: 4, taxaResposta: 50, nps: 100, csat: 100, seanEllis: 0 },
  { name: 'Eduardo Milani Pedrolo', enviados: 14, respostas: 2, taxaResposta: 14, nps: 50, csat: 100, seanEllis: 50 },
  { name: 'Luis Eduardo Dagostini', enviados: 11, respostas: 8, taxaResposta: 73, nps: 38, csat: 75, seanEllis: 50 },
  { name: 'Gustavo Ferreira Cochlar', enviados: 9, respostas: 4, taxaResposta: 44, nps: 0, csat: 100, seanEllis: 0 },
  { name: 'Everton Bisinella', enviados: 7, respostas: 2, taxaResposta: 29, nps: -100, csat: 0, seanEllis: 0 },
  { name: 'Marcelo Ritter', enviados: 8, respostas: 0, taxaResposta: 0, nps: 0, csat: 0, seanEllis: null },
];

export const FEEDBACK: Record<string, FeedbackItem[]> = {
  elogios: [
    { quote: 'Alta disponibilidade e versatilidade no atendimento para processos recorrentes e também para novas ideias.', npsScore: 10, sentiment: 'Positivo' },
    { quote: 'Segurança para tomada de decisão, apoio técnico permanente e comunicação clara, com temas complexos, facilitam o entendimento para diversos públicos dentro da organização.', npsScore: 10, sentiment: 'Positivo' },
    { quote: 'Atendimento excelente, entendimento do assunto, busca e apresentação de soluções. Acompanhamento dos assuntos até sua solução.', npsScore: 10, sentiment: 'Positivo' },
    { quote: 'A clareza que estamos tendo. Gosto muito dos nossos encontros e dos resultados. Estamos pela primeira vez vendo números.', npsScore: 10, sentiment: 'Positivo' },
  ],
  sugestoes: [
    { quote: 'Poderia existir um acompanhamento com parte da equipe operacional também para melhoria interna dos processos da empresa, não ficando restrito ao acompanhamento do CFO apenas.', npsScore: 10, sentiment: 'Neutro' },
    { quote: 'Talvez um termômetro, um gráfico, de quanto a empresa já está adequada a metodologia. Sendo 100% quanto tá rodando todas informações e 0% com nada feito.', npsScore: 10, sentiment: 'Neutro' },
    { quote: 'Qualidade do trabalho realizado e o comprometimento. Precisamos finalizar o processo dos Indicadores online. Está se arrastando a muito tempo.', npsScore: 10, sentiment: 'Neutro' },
    { quote: 'Acredito que possa existir uma opção de suspensão temporária do contrato para ajustes internos durante o processo.', npsScore: 10, sentiment: 'Neutro' },
    { quote: 'Tecnicamente a plataforma ainda tem muito a ser ajustada. A empresa deve buscar a melhoria contínua e desenvolver outras funcionalidades.', npsScore: 8, sentiment: 'Neutro' },
    { quote: 'Vocês tem uma metodologia excelente. Minha sugestão é que continuem aperfeiçoando a metodologia, e um ponto importante é que tenhamos encontros presenciais pelo menos 1 vez por trimestre.', npsScore: 10, sentiment: 'Positivo' },
  ],
  criticas: [
    { quote: 'Em que pese ser um bom serviço, acredito que o investimento é um valor relevante e que não se enquadra para todas as empresas.', npsScore: 8, sentiment: 'Neutro' },
    { quote: 'Antes de indicar faria recomendações de momento da empresa e entenderia a expectativa. Falta uma agenda de projeto com entregáveis mais clara.', npsScore: 6, sentiment: 'Neutro' },
    { quote: 'Boa equipe. Precisaria ser menor o valor para conseguirmos manter.', npsScore: 8, sentiment: 'Neutro' },
    { quote: 'Tivemos um começo turbulento, e agora as coisas começaram a andar. A troca de CFO deveria ter sido mais clara.', npsScore: 6, sentiment: 'Negativo' },
  ],
  expectativas: [
    { quote: 'Não sentimos que temos um CFO na empresa. O projeto começou a evoluir um pouco mais agora, mas como estamos a 1 ano pagando, sentimos que não temos o resultado esperado.', npsScore: 5, sentiment: 'Negativo' },
    { quote: 'O apoio na tomada de decisão tem sido valioso. Houve a criação de uma expectativa elevada em relação à reunião de negociação, especialmente no que diz respeito a possíveis captações de recursos.', npsScore: 8, sentiment: 'Neutro' },
    { quote: 'O atendimento é muito bom, preocupação, zelo, cuidado, agilidade, disponibilidade. A expectativa vendida foi um turnaround, porém não foi isso que recebemos.', npsScore: 7, sentiment: 'Neutro' },
    { quote: 'Estamos concluindo a implantação, então ainda não temos um 10 por isso.', npsScore: 8, sentiment: 'Neutro' },
  ],
};

export const EXECUTIVE_SUMMARY = {
  pontosFortes: [
    'CSAT de 82% superou a meta de 80%, indicando alta satisfação com o serviço prestado.',
    '12 clientes promotores (55%) recomendam ativamente a empresa.',
    'NPS positivo de 36 demonstra que há mais promotores que detratores.',
    'Feedback qualitativo destaca a qualidade técnica da equipe e atendimento personalizado.',
  ],
  pontosAtencao: [
    'Taxa de resposta de 33% ficou abaixo da meta de 40%, sugerindo necessidade de melhorar engajamento.',
    'NPS de 36 não atingiu a meta de 40. Há espaço para converter neutros em promotores.',
    'Sean Ellis Score de 14% indica que o Product-Market Fit ainda não foi alcançado (meta: ≥40%).',
    '4 clientes detratores representam risco de churn e requerem atenção imediata.',
  ],
  recomendacoes: [
    'Plano de recuperação: Realizar follow-up individualizado com os 4 detratores para entender insatisfações.',
    'Aumentar engajamento: Implementar lembretes e incentivos para aumentar taxa de resposta nas próximas pesquisas.',
    'Fortalecer PMF: Revisar proposta de valor e identificar features críticas que aumentem a dependência do produto.',
    'Capitalizar promotores: Solicitar depoimentos e indicações dos 12 promotores identificados.',
  ],
  conclusao: 'Os resultados de Q4/2025 mostram uma base de clientes majoritariamente satisfeita (CSAT 82%), mas com oportunidades de melhoria na recomendação ativa (NPS) e no Product-Market Fit (Sean Ellis). A prioridade deve ser converter os 6 clientes neutros em promotores e recuperar os 4 detratores através de ações direcionadas.',
};
