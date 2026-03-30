import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { NpsMetrics } from '@/hooks/useNpsData';

interface GaugeProps {
  title: string;
  value: number;
  suffix?: string;
  subtitle: string;
  meta: number;
  metaSuffix?: string;
  maxValue?: number;
}

function Gauge({ title, value, suffix = '%', subtitle, meta, metaSuffix, maxValue = 100 }: GaugeProps) {
  const pct = Math.min((value / maxValue) * 100, 100);
  const color = pct >= (meta / maxValue) * 100 ? '#16a34a' : pct >= ((meta / maxValue) * 100) * 0.7 ? '#eab308' : '#dc2626';

  const data = [{ value: pct, fill: color }];

  return (
    <Card className="flex flex-col items-center py-6">
      <CardContent className="flex flex-col items-center p-0">
        <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
        <div className="relative w-[160px] h-[90px] overflow-hidden">
          <RadialBarChart
            width={160}
            height={160}
            cx={80}
            cy={80}
            innerRadius={55}
            outerRadius={75}
            startAngle={180}
            endAngle={0}
            barSize={14}
            data={data}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: 'hsl(var(--muted))' }}
              dataKey="value"
              angleAxisId={0}
              cornerRadius={8}
            />
          </RadialBarChart>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className="text-3xl font-bold text-foreground leading-none">
              {value}<span className="text-base font-normal">{suffix}</span>
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        <p className="text-xs text-muted-foreground">Meta: {meta}{metaSuffix || suffix}</p>
      </CardContent>
    </Card>
  );
}

interface Props {
  data: NpsMetrics;
}

export function NpsGauges({ data }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-6 h-0.5 bg-primary rounded" />
        Métricas Gerais da Empresa
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Gauge
          title="Taxa de Resposta"
          value={data.taxaResposta.score}
          subtitle="Clientes > 3 meses"
          meta={data.taxaResposta.meta}
        />
        <Gauge
          title="CSAT Score"
          value={data.csat.score}
          subtitle="Notas 4 e 5"
          meta={data.csat.meta}
        />
        <Gauge
          title="NPS Score"
          value={data.nps.score}
          suffix=""
          subtitle={data.nps.label}
          meta={data.nps.meta}
          metaSuffix=""
          maxValue={100}
        />
      </div>
    </div>
  );
}
