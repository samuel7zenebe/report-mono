import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  FileSpreadsheet,
  Save,
  RotateCcw,
  Calendar,
  Folder,
} from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports/preview")({
  component: () => <h1> Hell Man </h1>,
});

interface PreviewData {
  repository: string;
  summary: string;
  commitCount: number;
}

function RouteComponent() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [editableData, setEditableData] = useState<PreviewData[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["preview", dateRange],
    queryFn: () => fetchPreviewData(dateRange),
    enabled: !!dateRange?.from && !!dateRange?.to,
  });

  // Update editable data when new data arrives
  useEffect(() => {
    if (data?.data) {
      setEditableData(data.data);
    }
  }, [data]);

  const handleApply = () => {
    setDateRange(tempDateRange);
    setIsPopoverOpen(false);
  };

  const handleReset = () => {
    setTempDateRange(undefined);
    setDateRange(undefined);
    setEditableData([]);
    setIsPopoverOpen(false);
  };

  const handleSummaryChange = (index: number, newSummary: string) => {
    setEditableData((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, summary: newSummary } : item,
      ),
    );
  };

  const handleResetChanges = () => {
    if (data?.data) {
      setEditableData(data.data);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const summaries = editableData.map((item) => ({
        repository: item.repository,
        summary: item.summary,
      }));

      const response = await fetch("/api/excel/export-with-custom-summaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start: dateRange?.from?.toISOString(),
          end: dateRange?.to?.toISOString(),
          summaries,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to export");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Technical_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export Excel file");
    } finally {
      setIsExporting(false);
    }
  };

  if (!dateRange?.from || !dateRange?.to) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Excel Preview Editor
              </h1>
              <p className="text-sm text-muted-foreground">
                Edit summaries before exporting to Excel
              </p>
            </div>
          </div>
        </header>

        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Select Date Range</CardTitle>
            <CardDescription>
              Choose a date range to generate the preview data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Popover
              open={isPopoverOpen}
              onOpenChange={(open) => {
                setIsPopoverOpen(open);
                if (open) setTempDateRange(dateRange);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 gap-2 text-lg",
                    !dateRange && "text-muted-foreground",
                  )}
                >
                  <Calendar className="h-5 w-5" />
                  {dateRange?.from
                    ? dateRange.to
                      ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`
                      : format(dateRange.from, "MMM dd, yyyy")
                    : "Select date range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
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
                        variant="ghost"
                        size="sm"
                        className="justify-start h-8 text-xs"
                        onClick={() => {
                          const today = new Date();
                          const from = new Date();
                          from.setDate(
                            today.getDate() - (preset.days as number),
                          );
                          setTempDateRange({ from, to: today });
                        }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 text-xs text-destructive hover:text-destructive"
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                  </div>
                  <div className="p-3">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={tempDateRange?.from}
                      selected={tempDateRange}
                      onSelect={setTempDateRange}
                      numberOfMonths={2}
                    />
                    <div className="mt-3 flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/50">
                      <span className="text-xs text-muted-foreground">
                        {tempDateRange?.from && tempDateRange?.to
                          ? `${format(tempDateRange.from, "MMM dd")} - ${format(tempDateRange.to, "MMM dd, yyyy")}`
                          : "Select range"}
                      </span>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleApply}
                        disabled={!tempDateRange?.from || !tempDateRange?.to}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Generating AI summaries preview...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
          <FileSpreadsheet className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold">Failed to load preview</h2>
        <p className="text-muted-foreground text-center max-w-md">
          There was an error generating the preview. Please try again.
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  // Sync editable data with fetched data when data changes
  if (editableData.length === 0 && data?.data) {
    setEditableData(data.data);
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Excel Preview Editor
            </h1>
            <p className="text-sm text-muted-foreground">
              {dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                : "Edit summaries before exporting"}{" "}
              • {editableData.length} repositories
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Popover
            open={isPopoverOpen}
            onOpenChange={(open) => {
              setIsPopoverOpen(open);
              if (open) setTempDateRange(dateRange);
            }}
          >
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Calendar className="h-4 w-4" />
                {dateRange?.from
                  ? dateRange.to
                    ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`
                    : format(dateRange.from, "MMM dd, yyyy")
                  : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
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
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 text-xs"
                      onClick={() => {
                        const today = new Date();
                        const from = new Date();
                        from.setDate(today.getDate() - (preset.days as number));
                        setTempDateRange({ from, to: today });
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8 text-xs text-destructive hover:text-destructive"
                    onClick={handleReset}
                  >
                    Reset
                  </Button>
                </div>
                <div className="p-3">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={tempDateRange?.from}
                    selected={tempDateRange}
                    onSelect={setTempDateRange}
                    numberOfMonths={2}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground">
                      {tempDateRange?.from && tempDateRange?.to
                        ? `${format(tempDateRange.from, "MMM dd")} - ${format(tempDateRange.to, "MMM dd, yyyy")}`
                        : "Select range"}
                    </span>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleApply}
                      disabled={!tempDateRange?.from}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={handleResetChanges}
            disabled={isFetching || editableData.length === 0}
          >
            <RotateCcw className="h-4 w-4" />
            Reset Changes
          </Button>

          <Button
            size="sm"
            className="h-9 gap-2"
            onClick={handleExport}
            disabled={isExporting || editableData.length === 0}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Export Excel
          </Button>
        </div>
      </header>

      {/* Editable Cards */}
      <div className="space-y-4">
        {editableData.map((item, index) => (
          <Card
            key={item.repository}
            className="overflow-hidden border-muted/50"
          >
            <CardHeader className="pb-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Folder className="w-4 h-4 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-bold">
                    {item.repository}
                  </CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    {item.commitCount} commits
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Technical Summary (AI Generated - Edit before export)
                </label>
                <textarea
                  value={item.summary}
                  onChange={(e) => handleSummaryChange(index, e.target.value)}
                  className="w-full min-h-[120px] p-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  placeholder="Enter summary text..."
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editableData.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed rounded-3xl border-muted">
          <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No data found</h3>
          <p className="text-muted-foreground">
            No commits found for the selected date range.
          </p>
        </div>
      )}
    </div>
  );
}

const fetchPreviewData = async (dateRange?: DateRange) => {
  if (dateRange?.from && dateRange?.to) {
    const params = new URLSearchParams();
    params.set("start", dateRange.from.toISOString());
    params.set("end", dateRange.to.toISOString());

    const res = await fetch(`/api/excel/preview?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch preview data");
    return await res.json();
  }
  return { data: [] };
};
