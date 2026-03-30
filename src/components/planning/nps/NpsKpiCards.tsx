import { NpsKpis } from '@/hooks/useNpsData';
import { Users, MessageSquare, TrendingUp, Target } from 'lucide-react';

interface Props {
  data: NpsKpis;
}

export function NpsKpiCards({ data }: Props) {
  const kpis = [
    { icon: Users, label: 'Clientes Pesquisados', value: data.clientesPesquisados },
    { icon: MessageSquare, label: 'Respostas', value: data.respostas },
    { icon: TrendingUp, label: 'Taxa Resposta', value: `${data.taxaResposta}%` },
    { icon: Target, label: 'CFOs Ativos', value: data.cfosAtivos },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.label} className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">
            <div className="rounded-full bg-primary/10 p-2.5">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
