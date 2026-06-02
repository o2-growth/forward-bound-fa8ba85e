import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Optional helper text shown on hover (native title attribute). */
  hint?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
  allLabel?: string;
  className?: string;
  /** Icon renderer for each option (left of the label). */
  optionIcon?: (option: MultiSelectOption) => React.ReactNode;
  /** Extra renderer per option, shown right-aligned (e.g. counts). */
  renderOptionExtra?: (option: MultiSelectOption) => React.ReactNode;
  /** When true, show an inline X on the trigger to clear the filter (select all). */
  clearable?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = "Selecionar...",
  allLabel = "Todos",
  className,
  optionIcon,
  renderOptionExtra,
  clearable = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const allSelected = selected.length === options.length;
  const noneSelected = selected.length === 0;
  const isFiltered = !noneSelected && !allSelected;

  const handleToggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(options.map((o) => o.value));
    }
  };

  const handleToggleOption = (value: string) => {
    // Se todos estão selecionados, clicar em um item seleciona APENAS ele
    if (allSelected) {
      onSelectionChange([value]);
      return;
    }

    // Comportamento normal de toggle
    if (selected.includes(value)) {
      onSelectionChange(selected.filter((v) => v !== value));
    } else {
      onSelectionChange([...selected, value]);
    }
  };

  const getDisplayText = () => {
    if (noneSelected) return placeholder;
    if (allSelected) return allLabel;
    if (selected.length === 1) {
      return options.find((o) => o.value === selected[0])?.label || selected[0];
    }
    if (selected.length <= 2) {
      return selected
        .map((v) => options.find((o) => o.value === v)?.label || v)
        .join(", ");
    }
    return `${selected.length} selecionados`;
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    // "Limpar" = sem filtro = todas marcadas (semântica do filtro de origem/closer/sdr).
    onSelectionChange(options.map((o) => o.value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between min-w-[140px]", className)}
        >
          <span className="flex items-center gap-1.5 truncate">
            {isFiltered && (
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              />
            )}
            <span className="truncate">{getDisplayText()}</span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {clearable && isFiltered && (
              <span
                role="button"
                aria-label="Limpar filtro"
                onClick={handleClear}
                onPointerDown={(e) => e.stopPropagation()}
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-sm opacity-60 hover:opacity-100 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown className="ml-1 h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-2" align="start">
        <div className="flex flex-col gap-1">
          {/* "All" option */}
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer"
            onClick={handleToggleAll}
          >
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleToggleAll}
              className="pointer-events-none"
            />
            <span className="text-sm font-medium">{allLabel}</span>
          </div>

          <div className="h-px bg-border my-1" />

          {/* Individual options */}
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <div
                key={option.value}
                title={option.hint}
                className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer"
                onClick={() => handleToggleOption(option.value)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggleOption(option.value)}
                  className="pointer-events-none"
                />
                {optionIcon && (
                  <span className="flex items-center text-muted-foreground shrink-0">
                    {optionIcon(option)}
                  </span>
                )}
                <span className="text-sm truncate">{option.label}</span>
                {renderOptionExtra && (
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {renderOptionExtra(option)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
