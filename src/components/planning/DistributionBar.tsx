import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonthType, MONTHS } from '@/hooks/useMonetaryMetas';
import { ArrowLeftRight, CalendarRange, Undo2, Check } from 'lucide-react';

interface DistributionBarProps {
  buLabel: string;
  difference: number;
  onDistributeRemaining: () => void;
  onDistributePeriod: (months: MonthType[]) => void;
  onDiscard: () => void;
  editedMonths: Set<string>;
}

const QUARTERS: Record<string, MonthType[]> = {
  Q1: ['Jan', 'Fev', 'Mar'],
  Q2: ['Abr', 'Mai', 'Jun'],
  Q3: ['Jul', 'Ago', 'Set'],
  Q4: ['Out', 'Nov', 'Dez'],
};

const formatCurrency = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R$ ${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `R$ ${(abs / 1_000).toFixed(1)}k`;
  return `R$ ${abs.toFixed(0)}`;
};

export function DistributionBar({
  buLabel,
  difference,
  onDistributeRemaining,
  onDistributePeriod,
  onDiscard,
  editedMonths,
}: DistributionBarProps) {
  const [periodType, setPeriodType] = useState<string>('');
  const [customStart, setCustomStart] = useState<MonthType>('Jan');
  const [customEnd, setCustomEnd] = useState<MonthType>('Dez');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const sign = difference > 0 ? '+' : '';
  const diffLabel = `${sign}${formatCurrency(difference)}`;

  const handleConfirmPeriod = () => {
    let targetMonths: MonthType[];
    if (QUARTERS[periodType]) {
      targetMonths = QUARTERS[periodType];
    } else {
      const startIdx = MONTHS.indexOf(customStart);
      const endIdx = MONTHS.indexOf(customEnd);
      const lo = Math.min(startIdx, endIdx);
      const hi = Math.max(startIdx, endIdx);
      targetMonths = MONTHS.slice(lo, hi + 1);
    }
    // Exclude edited months
    targetMonths = targetMonths.filter(m => !editedMonths.has(m));
    if (targetMonths.length === 0) return;
    onDistributePeriod(targetMonths);
    setPopoverOpen(false);
    setPeriodType('');
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border rounded-xl shadow-lg px-6 py-3 flex items-center gap-4 flex-wrap">
      <Badge variant="outline" className="text-sm font-semibold">
        {buLabel}: {diffLabel}
      </Badge>

      <Button size="sm" variant="secondary" onClick={onDistributeRemaining}>
        <ArrowLeftRight className="h-4 w-4 mr-1.5" />
        Distribuir nos restantes
      </Button>

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="secondary">
            <CalendarRange className="h-4 w-4 mr-1.5" />
            Distribuir em período
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3" align="center">
          <p className="text-sm font-medium">Selecione o período</p>
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger>
              <SelectValue placeholder="Quarter ou personalizado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Q1">Q1 (Jan–Mar)</SelectItem>
              <SelectItem value="Q2">Q2 (Abr–Jun)</SelectItem>
              <SelectItem value="Q3">Q3 (Jul–Set)</SelectItem>
              <SelectItem value="Q4">Q4 (Out–Dez)</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {periodType === 'custom' && (
            <div className="flex items-center gap-2">
              <Select value={customStart} onValueChange={(v) => setCustomStart(v as MonthType)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-sm">até</span>
              <Select value={customEnd} onValueChange={(v) => setCustomEnd(v as MonthType)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            size="sm"
            className="w-full"
            disabled={!periodType}
            onClick={handleConfirmPeriod}
          >
            <Check className="h-4 w-4 mr-1.5" />
            Confirmar
          </Button>
        </PopoverContent>
      </Popover>

      <Button size="sm" variant="ghost" onClick={onDiscard}>
        <Undo2 className="h-4 w-4 mr-1.5" />
        Descartar
      </Button>
    </div>
  );
}
