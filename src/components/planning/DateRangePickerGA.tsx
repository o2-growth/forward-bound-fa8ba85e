import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  startOfWeek,
  endOfWeek,
  subWeeks,
  endOfDay,
  parse,
  isValid,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateRangePickerGAProps {
  startDate: Date;
  endDate: Date;
  onDateChange: (start: Date, end: Date) => void;
}

type PresetKey =
  | "custom"
  | "today"
  | "yesterday"
  | "thisWeek"
  | "last7"
  | "lastWeek"
  | "last14"
  | "thisMonth"
  | "last30"
  | "lastMonth"
  | "allTime";

interface Preset {
  key: PresetKey;
  label: string;
  getRange: () => { from: Date; to: Date };
}

const buildPresets = (): Preset[] => {
  const today = new Date();
  const yesterday = subDays(today, 1);

  return [
    {
      key: "custom",
      label: "Personalizar",
      getRange: () => ({ from: startOfMonth(today), to: endOfDay(today) }),
    },
    {
      key: "today",
      label: "Hoje",
      getRange: () => ({ from: today, to: endOfDay(today) }),
    },
    {
      key: "yesterday",
      label: "Ontem",
      getRange: () => ({ from: yesterday, to: endOfDay(yesterday) }),
    },
    {
      key: "thisWeek",
      label: "Esta semana (dom. até hoje)",
      getRange: () => ({
        from: startOfWeek(today, { weekStartsOn: 0 }),
        to: endOfDay(today),
      }),
    },
    {
      key: "last7",
      label: "7 dias atrás",
      getRange: () => ({ from: subDays(today, 6), to: endOfDay(today) }),
    },
    {
      key: "lastWeek",
      label: "Semana passada (dom. a sáb.)",
      getRange: () => {
        const lw = subWeeks(today, 1);
        return {
          from: startOfWeek(lw, { weekStartsOn: 0 }),
          to: endOfWeek(lw, { weekStartsOn: 0 }),
        };
      },
    },
    {
      key: "last14",
      label: "14 dias atrás",
      getRange: () => ({ from: subDays(today, 13), to: endOfDay(today) }),
    },
    {
      key: "thisMonth",
      label: "Este mês",
      getRange: () => ({
        from: startOfMonth(today),
        to: endOfDay(today),
      }),
    },
    {
      key: "last30",
      label: "30 dias atrás",
      getRange: () => ({ from: subDays(today, 29), to: endOfDay(today) }),
    },
    {
      key: "lastMonth",
      label: "Último mês",
      getRange: () => {
        const lm = subMonths(today, 1);
        return { from: startOfMonth(lm), to: endOfMonth(lm) };
      },
    },
    {
      key: "allTime",
      label: "Todo o período",
      getRange: () => ({
        from: new Date(2026, 0, 1),
        to: endOfDay(today),
      }),
    },
  ];
};

export function DateRangePickerGA({
  startDate,
  endDate,
  onDateChange,
}: DateRangePickerGAProps) {
  const [open, setOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<Date>(startDate);
  const [tempTo, setTempTo] = useState<Date>(endDate);
  const [activePreset, setActivePreset] = useState<PresetKey>("thisMonth");
  const [daysToToday, setDaysToToday] = useState("");
  const [daysToYesterday, setDaysToYesterday] = useState("");

  // Text inputs for manual date entry
  const [fromText, setFromText] = useState(format(startDate, "dd/MM/yyyy"));
  const [toText, setToText] = useState(format(endDate, "dd/MM/yyyy"));

  const presets = useMemo(() => buildPresets(), []);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setTempFrom(startDate);
      setTempTo(endDate);
      setFromText(format(startDate, "dd/MM/yyyy"));
      setToText(format(endDate, "dd/MM/yyyy"));
      setDaysToToday("");
      setDaysToYesterday("");
    }
    setOpen(isOpen);
  };

  const selectPreset = (preset: Preset) => {
    const { from, to } = preset.getRange();
    setTempFrom(from);
    setTempTo(to);
    setActivePreset(preset.key);
    setFromText(format(from, "dd/MM/yyyy"));
    setToText(format(to, "dd/MM/yyyy"));
    setDaysToToday("");
    setDaysToYesterday("");
  };

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from) {
      setTempFrom(range.from);
      setFromText(format(range.from, "dd/MM/yyyy"));
    }
    if (range?.to) {
      setTempTo(range.to);
      setToText(format(range.to, "dd/MM/yyyy"));
    } else if (range?.from) {
      setTempTo(range.from);
      setToText(format(range.from, "dd/MM/yyyy"));
    }
    setActivePreset("custom");
  };

  const handleDaysToToday = (val: string) => {
    setDaysToToday(val);
    setDaysToYesterday("");
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) {
      const today = new Date();
      const from = subDays(today, n - 1);
      setTempFrom(from);
      setTempTo(endOfDay(today));
      setFromText(format(from, "dd/MM/yyyy"));
      setToText(format(today, "dd/MM/yyyy"));
      setActivePreset("custom");
    }
  };

  const handleDaysToYesterday = (val: string) => {
    setDaysToYesterday(val);
    setDaysToToday("");
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) {
      const yesterday = subDays(new Date(), 1);
      const from = subDays(yesterday, n - 1);
      setTempFrom(from);
      setTempTo(endOfDay(yesterday));
      setFromText(format(from, "dd/MM/yyyy"));
      setToText(format(yesterday, "dd/MM/yyyy"));
      setActivePreset("custom");
    }
  };

  const handleFromTextBlur = () => {
    const parsed = parse(fromText, "dd/MM/yyyy", new Date());
    if (isValid(parsed)) {
      setTempFrom(parsed);
      setActivePreset("custom");
    } else {
      setFromText(format(tempFrom, "dd/MM/yyyy"));
    }
  };

  const handleToTextBlur = () => {
    const parsed = parse(toText, "dd/MM/yyyy", new Date());
    if (isValid(parsed)) {
      setTempTo(parsed);
      setActivePreset("custom");
    } else {
      setToText(format(tempTo, "dd/MM/yyyy"));
    }
  };

  const handleApply = () => {
    onDateChange(tempFrom, endOfDay(tempTo));
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const displayText = `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start text-left font-normal min-w-[220px]"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 z-50 bg-popover border shadow-lg"
        align="end"
        sideOffset={4}
      >
        <div className="flex flex-col">
          {/* Date inputs row */}
          <div className="flex border-b p-3 gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Data de início
              </label>
              <Input
                value={fromText}
                onChange={(e) => setFromText(e.target.value)}
                onBlur={handleFromTextBlur}
                onKeyDown={(e) => e.key === "Enter" && handleFromTextBlur()}
                className="h-8 text-sm"
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Data de término
              </label>
              <Input
                value={toText}
                onChange={(e) => setToText(e.target.value)}
                onBlur={handleToTextBlur}
                onKeyDown={(e) => e.key === "Enter" && handleToTextBlur()}
                className="h-8 text-sm"
                placeholder="dd/mm/aaaa"
              />
            </div>
          </div>

          {/* Main content: presets + calendar */}
          <div className="flex">
            {/* Left: presets */}
            <div className="w-52 border-r p-2 flex flex-col gap-0.5 max-h-[420px] overflow-y-auto">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => selectPreset(preset)}
                  className={cn(
                    "text-left px-3 py-1.5 rounded text-sm transition-colors hover:bg-accent",
                    activePreset === preset.key &&
                      "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {preset.label}
                </button>
              ))}

              {/* Custom day inputs */}
              <div className="border-t mt-2 pt-2 space-y-2 px-1">
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    value={daysToToday}
                    onChange={(e) => handleDaysToToday(e.target.value)}
                    className="h-7 w-14 text-xs text-center"
                    placeholder="30"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    dias até hoje
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    value={daysToYesterday}
                    onChange={(e) => handleDaysToYesterday(e.target.value)}
                    className="h-7 w-14 text-xs text-center"
                    placeholder="30"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    dias até ontem
                  </span>
                </div>
              </div>
            </div>

            {/* Right: calendar */}
            <div className="p-2">
              <Calendar
                mode="range"
                selected={{ from: tempFrom, to: tempTo }}
                onSelect={handleCalendarSelect}
                numberOfMonths={3}
                locale={ptBR}
                className="pointer-events-auto"
                defaultMonth={subMonths(tempFrom, 1)}
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 border-t p-3">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleApply}>
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
