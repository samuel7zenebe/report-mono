import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = DayPickerProps;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-5", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-6 sm:space-y-0",
        month: "space-y-5",
        caption: "flex justify-center pt-2 relative items-center mb-2",
        caption_label: "text-base font-bold text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-9 bg-background/50 backdrop-blur-sm p-0 hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-sm hover:shadow-md border-primary/20"
        ),
        nav_button_previous: "absolute left-2",
        nav_button_next: "absolute right-2",
        table: "w-full border-collapse space-y-1",
        head_row: "flex mb-2",
        head_cell:
          "text-muted-foreground/70 rounded-md w-10 font-bold text-xs uppercase tracking-widest",
        row: "flex w-full mt-1.5",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected].day-range-end)]:rounded-r-lg",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-lg [&:has(>.day-range-start)]:rounded-l-lg first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg [&:has([aria-selected].day-outside)]:bg-accent/30"
            : "[&:has([aria-selected])]:rounded-lg"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-semibold aria-selected:opacity-100 hover:bg-primary/20 hover:text-primary hover:scale-110 transition-all duration-200 rounded-lg"
        ),
        day_range_start:
          "day-range-start rounded-l-lg bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_range_end:
          "day-range-end rounded-r-lg bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold shadow-lg scale-105 border border-primary",
        day_today:
          "bg-linear-to-br from-accent to-accent/50 text-accent-foreground font-bold ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
        day_outside:
          "day-outside text-muted-foreground/30 aria-selected:bg-accent/20 aria-selected:text-muted-foreground/40",
        day_disabled: "text-muted-foreground/20 opacity-30 line-through",
        day_range_middle:
          "aria-selected:bg-linear-to-r aria-selected:from-primary/10 aria-selected:via-primary/20 aria-selected:to-primary/10 aria-selected:text-foreground rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
