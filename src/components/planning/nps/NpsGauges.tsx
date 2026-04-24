import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { NpsMetrics } from '@/hooks/useNpsData';
import { Info } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface GaugeProps {
  title: string;
  value: number;
  suffix?: string;
  subtitle: string;
  meta: number;
  metaSuffix?: string;
  maxValue?: number;
  tooltip?: string;
}

function Gauge({ title, value, suffix = '%', subtitle, meta, metaSuffix, maxValue = 100, tooltip }: GaugeProps) {
  const pct = Math.min((value / maxValue) * 100, 100);
  const color = pct >= (meta / maxValue) * 100 ? '#16a34a' : pct >= ((meta / maxValue) * 100) * 0.7 ? '#eab308' : '#dc2626';

  const data = [{ value: pct, fill: color }];

  return (
    <Card className="flex flex-col items-center py-6">
      <CardContent className="flex flex-col items-center p-0">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          {title}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </h3>
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
    <TooltipProvider>
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
          tooltip="Respostas / Pesquisados × 100. Considera apenas clientes elegíveis (Onboarding ou Em Operação Recorrente, > 3 meses). Fonte: Pipefy — Pesquisa de Satisfação NPS"
        />
        <Gauge
          title="CSAT Score"
          value={data.csat.score}
          subtitle="Notas 4 e 5"
          meta={data.csat.meta}
          tooltip="% de notas 4 e 5 sobre total de respondentes. CSAT = (Nota 4 + Nota 5) / Total Respostas × 100. Fonte: Pipefy — Pesquisa de Satisfação NPS"
        />
        <Gauge
          title="NPS Score"
          value={data.nps.score}
          suffix=""
          subtitle={data.nps.label}
          meta={data.nps.meta}
          metaSuffix=""
          maxValue={100}
          tooltip="(Promotores - Detratores) / Total Respostas × 100. Promotores = nota 9-10. Detratores = nota 0-6. Deduplicado por cliente (última resposta). Fonte: Pipefy — Pesquisa NPS"
        />
      </div>
    </div>
    </TooltipProvider>
  );
}
