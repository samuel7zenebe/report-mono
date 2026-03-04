"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DayPickerProps {
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  className?: string;
}

export default function DayPicker({
  dateRange,
  onDateRangeChange,
  className,
}: DayPickerProps) {
  const [tempRange, setTempRange] = useState<DateRange | undefined>(dateRange);
  const [isOpen, setIsOpen] = useState(false);

  // Sync temp range when dateRange changes from outside
  useEffect(() => {
    setTempRange(dateRange);
  }, [dateRange]);

  const handleApply = () => {
    onDateRangeChange?.(tempRange);
    setIsOpen(false);
  };

  const handleReset = () => {
    setTempRange(undefined);
    onDateRangeChange?.(undefined);
    setIsOpen(false);
  };

  const handlePresetClick = (days: number) => {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - days);
    setTempRange({ from, to: today });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <Button
          type="button"
          variant="outline"
          className={`w-full justify-start ${className || ""}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from
            ? dateRange.to
              ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`
              : format(dateRange.from, "MMM dd, yyyy")
            : "Select date range"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col md:flex-row">
          <div className="p-3 bg-muted/30 border-b md:border-b-0 md:border-r border-border/40 flex flex-col gap-1">
            {[
              { label: "This Month", days: 0 },
              { label: "Last 7 Days", days: 7 },
              { label: "Last 30 Days", days: 30 },
              { label: "Last 90 Days", days: 90 },
            ].map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start h-8 text-xs"
                onClick={() => handlePresetClick(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start h-8 text-xs text-destructive hover:text-destructive"
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempRange?.from}
              selected={tempRange}
              onSelect={setTempRange}
              numberOfMonths={2}
            />
            <div className="mt-3 flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground">
                {tempRange?.from && tempRange?.to
                  ? `${format(tempRange.from, "MMM dd")} - ${format(tempRange.to, "MMM dd, yyyy")}`
                  : "Select range"}
              </span>
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs"
                onClick={handleApply}
                disabled={!tempRange?.from || !tempRange?.to}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
