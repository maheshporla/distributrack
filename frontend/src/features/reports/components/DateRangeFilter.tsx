import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  DATE_RANGE_PRESET_LABELS,
  type DateRangePreset,
} from "@/lib/dateRange";

interface DateRangeFilterProps {
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  /** Custom range values (ISO dates), only used when preset === "custom". */
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}

const PRESETS: DateRangePreset[] = ["today", "week", "month", "custom"];

export function DateRangeFilter({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={preset === option ? "default" : "outline"}
            onClick={() => onPresetChange(option)}
          >
            {DATE_RANGE_PRESET_LABELS[option]}
          </Button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            From
            <Input
              type="date"
              value={customFrom}
              onChange={(event) => onCustomFromChange(event.target.value)}
              className="mt-1 h-9 w-40"
            />
          </label>

          <label className="text-xs font-medium text-muted-foreground">
            To
            <Input
              type="date"
              value={customTo}
              onChange={(event) => onCustomToChange(event.target.value)}
              className="mt-1 h-9 w-40"
            />
          </label>
        </div>
      )}

      <div className={cn("flex flex-wrap items-center gap-1 text-xs text-muted-foreground")}>
        <span>Range:</span>
        <span className="font-medium text-foreground">
          {customRangeSummary(preset, customFrom, customTo)}
        </span>
      </div>
    </div>
  );
}

function customRangeSummary(
  preset: DateRangePreset,
  customFrom: string,
  customTo: string,
): string {
  if (preset === "custom") {
    if (customFrom && customTo) return `${customFrom} → ${customTo}`;
    if (customFrom) return `from ${customFrom}`;
    if (customTo) return `up to ${customTo}`;
    return "all time";
  }
  return DATE_RANGE_PRESET_LABELS[preset];
}
