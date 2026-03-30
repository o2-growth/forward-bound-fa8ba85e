import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
  allLabel?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = "Selecionar...",
  allLabel = "Todos",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const allSelected = selected.length === options.length;
  const noneSelected = selected.length === 0;

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between min-w-[140px]", className)}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
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
            {allSelected && <Check className="ml-auto h-4 w-4 text-primary" />}
          </div>

          <div className="h-px bg-border my-1" />

          {/* Individual options */}
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <div
                key={option.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer"
                onClick={() => handleToggleOption(option.value)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggleOption(option.value)}
                  className="pointer-events-none"
                />
                <span className="text-sm">{option.label}</span>
                {isSelected && <Check className="ml-auto h-4 w-4 text-primary" />}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
