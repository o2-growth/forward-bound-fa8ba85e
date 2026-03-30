import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NpsDistributionData, CsatDistributionData, SeanEllisItem } from '@/hooks/useNpsData';

function NpsDistribution({ data }: { data: NpsDistributionData }) {
  const { promotores, neutros, detratores } = data;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Distribuição NPS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex rounded-full overflow-hidden h-7 text-xs font-semibold text-white">
          {promotores.pct > 0 && <div className="bg-green-500 flex items-center justify-center" style={{ width: `${promotores.pct}%` }}>{promotores.pct}%</div>}
          {neutros.pct > 0 && <div className="bg-amber-500 flex items-center justify-center" style={{ width: `${neutros.pct}%` }}>{neutros.pct}%</div>}
          {detratores.pct > 0 && <div className="bg-red-500 flex items-center justify-center" style={{ width: `${detratores.pct}%` }}>{detratores.pct}%</div>}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { ...promotores, color: 'bg-green-500', name: 'Promotores', textColor: 'text-green-600' },
            { ...neutros, color: 'bg-amber-500', name: 'Neutros', textColor: 'text-amber-600' },
            { ...detratores, color: 'bg-red-500', name: 'Detratores', textColor: 'text-red-600' },
          ].map(item => (
            <div key={item.name}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
              <p className={`text-2xl font-bold ${item.textColor}`}>{item.count}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground border-t pt-2">
          NPS = % Promotores ({promotores.pct}%) - % Detratores ({detratores.pct}%) = <strong>{promotores.pct - detratores.pct}</strong>
        </p>
      </CardContent>
    </Card>
  );
}

function CsatDistribution({ data }: { data: CsatDistributionData }) {
  const { satisfeitos, neutros, insatisfeitos, breakdown } = data;
  const colors = ['bg-green-500', 'bg-green-400', 'bg-amber-400', 'bg-red-400', 'bg-red-500'];
  const maxCount = Math.max(...breakdown.map(b => b.count), 1);
  const total = satisfeitos.count + neutros.count + insatisfeitos.count;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Distribuição CSAT</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex rounded-full overflow-hidden h-7 text-xs font-semibold text-white">
          {satisfeitos.pct > 0 && <div className="bg-green-500 flex items-center justify-center" style={{ width: `${satisfeitos.pct}%` }}>{satisfeitos.pct}%</div>}
          {neutros.pct > 0 && <div className="bg-amber-500 flex items-center justify-center" style={{ width: `${neutros.pct}%` }}>{neutros.pct}%</div>}
          {insatisfeitos.pct > 0 && <div className="bg-red-500 flex items-center justify-center" style={{ width: `${insatisfeitos.pct}%` }}>{insatisfeitos.pct}%</div>}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Satisfeitos (4-5)</span><span>Neutros (3)</span><span>Insatisfeitos (1-2)</span>
        </div>
        <div className="space-y-2">
          {breakdown.map((item, i) => (
            <div key={item.nota} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${colors[i]}`} />
              <span className="text-xs text-muted-foreground flex-1 min-w-0">
                <strong>{item.label}</strong> <span className="text-muted-foreground/70">(nota {item.nota})</span>
              </span>
              <div className="w-24 bg-muted rounded-full h-2">
                <div className={`h-2 rounded-full ${colors[i]}`} style={{ width: `${(item.count / maxCount) * 100}%` }} />
              </div>
              <span className="text-xs font-semibold w-4 text-right">{item.count}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground border-t pt-2">
          CSAT = (Notas 4 + 5) ÷ Total = {satisfeitos.count}/{total} = <strong>{satisfeitos.pct}%</strong>
        </p>
      </CardContent>
    </Card>
  );
}

function SeanEllisDistribution({ data, excluded }: { data: SeanEllisItem[]; excluded: number }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Distribuição Sean Ellis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-40 shrink-0">{item.label}</span>
            <div className="flex-1 bg-muted rounded-full h-4">
              <div className={`h-4 rounded-full ${item.color}`} style={{ width: `${(item.count / maxCount) * 100}%` }} />
            </div>
            <span className="text-sm font-semibold w-6 text-right">{item.count}</span>
          </div>
        ))}
        {excluded > 0 && (
          <p className="text-[11px] text-muted-foreground border-t pt-3 mt-2">
            {excluded} respondentes excluídos (sem resposta de sentimento)
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          PMF considerado alcançado quando ≥ 40%
        </p>
      </CardContent>
    </Card>
  );
}

interface Props {
  npsDistribution: NpsDistributionData;
  csatDistribution: CsatDistributionData;
  seanEllisDistribution: SeanEllisItem[];
  seExcluded: number;
}

export function NpsDistributions({ npsDistribution, csatDistribution, seanEllisDistribution, seExcluded }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <NpsDistribution data={npsDistribution} />
      <CsatDistribution data={csatDistribution} />
      <SeanEllisDistribution data={seanEllisDistribution} excluded={seExcluded} />
    </div>
  );
}
