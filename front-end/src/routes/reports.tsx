import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/api-route";
import type { Commit } from "../../../server/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GitCommit,
  Calendar as CalendarIcon,
  Folder,
  Sparkles,
  Loader2,
  RefreshCw,
  LayoutGrid,
  List,
  Check,
  Copy,
  Clock,
  Database,
  ChevronRight,
  FileSpreadsheet,
  CloudUpload,
} from "lucide-react";
import { authClient } from "@/lib/authClient";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  component: RouteComponent,
});

function RouteComponent() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>();
  const [view, setView] = useState<"card" | "list">("card");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const { data: session } = authClient.useSession();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["reports", dateRange],
    queryFn: () => fetchSummaries(dateRange),
  });

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleApply = () => {
    setDateRange(tempDateRange);
    setIsPopoverOpen(false);
  };

  const handleReset = () => {
    setTempDateRange(undefined);
    setDateRange(undefined);
    setIsPopoverOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Fetching latest summaries...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
          <RefreshCw className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold">Failed to load reports</h2>
        <p className="text-muted-foreground text-center max-w-md">
          There was an error connecting to the database. Please check your
          connection and try again.
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-10">
      <header className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-10 border-b border-border/40">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
              Intelligence Engine
            </span>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight lg:text-5xl bg-linear-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent italic">
              AI Summaries
            </h1>
            <p className="text-muted-foreground text-lg font-medium max-w-2xl leading-relaxed">
              Real-time semantic analysis of your development workflow{" "}
              {dateRange?.from && dateRange?.to ? (
                <span className="text-foreground font-semibold">
                  from {format(dateRange.from, "PPP")} to{" "}
                  {format(dateRange.to, "PPP")}
                </span>
              ) : (
                <span className="text-foreground font-semibold italic opacity-80">
                  Last 7 Days Activity
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap self-start lg:self-center">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              Active Commits
            </span>
            <span className="text-2xl font-black text-foreground tabular-nums">
              {data?.total || 0}
            </span>
          </div>

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
                  "group h-14 px-5 border-2 hover:border-primary transition-all duration-300 shadow-xl rounded-2xl bg-card/40 backdrop-blur-md flex gap-4 min-w-[280px]",
                  !dateRange && "text-muted-foreground",
                  isPopoverOpen &&
                    "ring-2 ring-primary/20 ring-offset-2 border-primary",
                )}
              >
                <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-widest leading-none">
                    Filter By Date
                  </span>
                  <span className="font-bold text-sm text-foreground truncate max-w-[180px]">
                    {dateRange?.from
                      ? dateRange.to
                        ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                        : format(dateRange.from, "MMMM dd, yyyy")
                      : "Select time period..."}
                  </span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden bg-background/95 backdrop-blur-xl"
              align="end"
              sideOffset={12}
            >
              <div className="flex flex-col md:flex-row">
                <div className="p-6 bg-muted/20 border-b md:border-b-0 md:border-r border-border/40 min-w-[200px] flex flex-col gap-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4 px-2">
                    Presets
                  </h4>
                  {[
                    { label: "Real-time Today", days: 0, icon: Sparkles },
                    { label: "Yesterday", days: 1, icon: Clock },
                    { label: "Trailing 7 Days", days: 7, icon: CalendarIcon },
                    { label: "Past Month", days: 30, icon: Database },
                  ].map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      className="justify-between h-11 px-4 text-xs font-bold rounded-xl hover:bg-primary/10 hover:text-primary transition-all group"
                      onClick={() => {
                        const today = new Date();
                        const from = new Date();
                        from.setDate(today.getDate() - (preset.days as number));
                        setTempDateRange({ from, to: today });
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <preset.icon className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        {preset.label}
                      </span>
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </Button>
                  ))}
                  <div className="mt-auto pt-6 border-t border-border/40">
                    <Button
                      variant="destructive"
                      className="w-full h-11 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-destructive/20 hover:scale-105 transition-transform"
                      onClick={handleReset}
                    >
                      Reset Filter
                    </Button>
                  </div>
                </div>
                <div className="p-4 flex flex-col">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={tempDateRange?.from}
                    selected={tempDateRange}
                    onSelect={setTempDateRange}
                    numberOfMonths={2}
                    className="p-4"
                  />
                  <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                        Selected Range
                      </span>
                      <span className="text-xs font-black">
                        {tempDateRange?.from && tempDateRange?.to
                          ? `${format(tempDateRange.from, "PPP")} – ${format(tempDateRange.to, "PPP")}`
                          : "Please select a range on the calendar"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-lg px-6 font-bold shadow-lg shadow-primary/25 hover:scale-105 transition-transform"
                      onClick={handleApply}
                      disabled={!tempDateRange?.from}
                    >
                      Apply Selection
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="lg"
            className="h-14 px-6 rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-xl shadow-emerald-500/10 flex gap-3 font-bold group/excel"
            onClick={() => {
              const params = new URLSearchParams();
              if (dateRange?.from)
                params.set("start", dateRange.from.toISOString());
              if (dateRange?.to) params.set("end", dateRange.to.toISOString());
              const queryString = params.toString();
              const url = `/api/excel/export-monthly-summaries${queryString ? `?${queryString}` : ""}`;
              window.open(url, "_blank");
            }}
          >
            <div className="bg-emerald-500/20 p-1.5 rounded-lg group-hover/excel:bg-white/20 transition-colors">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <span>Export Monthly Logs</span>
          </Button>

          {session?.user && (
            <Button
              variant="outline"
              size="lg"
              disabled={isSavingToDrive}
              className="h-14 px-6 rounded-2xl border-2 border-blue-500/20 bg-blue-500/5 text-blue-600 hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-blue-500/10 flex gap-3 font-bold group/drive"
              onClick={async () => {
                setIsSavingToDrive(true);
                try {
                  const params = new URLSearchParams();
                  if (dateRange?.from)
                    params.set("start", dateRange.from.toISOString());
                  if (dateRange?.to)
                    params.set("end", dateRange.to.toISOString());

                  const res = await fetch(
                    `/api/excel/save-to-onedrive?${params.toString()}`,
                  );
                  const result = await res.json();

                  if (result.success) {
                    window.open(result.webUrl, "_blank");
                  } else {
                    alert(result.error || "Failed to save to OneDrive");
                  }
                } catch (err) {
                  console.error(err);
                  alert("An error occurred while saving to OneDrive");
                } finally {
                  setIsSavingToDrive(false);
                }
              }}
            >
              <div className="bg-blue-500/20 p-1.5 rounded-lg group-hover/drive:bg-white/20 transition-colors">
                {isSavingToDrive ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CloudUpload className="h-5 w-5" />
                )}
              </div>
              <span>{isSavingToDrive ? "Saving..." : "Save to OneDrive"}</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className={cn(
              "h-14 w-14 rounded-2xl border-2 transition-all hover:bg-muted/50 text-muted-foreground hover:text-primary",
              isFetching &&
                "animate-spin cursor-not-allowed border-primary/50 text-primary",
            )}
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <Tabs
        defaultValue="card"
        value={view}
        onValueChange={(v) => setView(v as "card" | "list")}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="card" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Card View
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              List View
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="card" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.data?.map((item: Commit) => (
              <Card
                key={item.id}
                className="group hover:shadow-xl transition-all duration-300 border-muted/50 overflow-hidden flex flex-col hover:scale-[1.02]"
              >
                <CardHeader className="space-y-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] opacity-70"
                      >
                        {item.commitSha.substring(0, 7)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() =>
                          copyToClipboard(item.summary || "", item.id)
                        }
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                      {item.repositoryName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-1">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {new Date(item.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="grow">
                  <ul className="space-y-1.5 text-sm">
                    {item.summary
                      ?.split(".")
                      .filter((sentence) => sentence.trim().length > 0)
                      .map((sentence, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-foreground/90 leading-relaxed">
                            {sentence.trim()}
                          </span>
                        </li>
                      ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-3">
          {data?.data?.map((item: Commit) => (
            <Card
              key={item.id}
              className="group hover:shadow-lg transition-all duration-200 border-muted/50"
            >
              <CardHeader className="py-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div className="grow space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                          {item.repositoryName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            {new Date(item.date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-muted-foreground/50">•</span>
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px]"
                          >
                            {item.commitSha.substring(0, 7)}
                          </Badge>
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() =>
                          copyToClipboard(item.summary || "", item.id)
                        }
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {item.summary
                        ?.split(".")
                        .filter((sentence) => sentence.trim().length > 0)
                        .map((sentence, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-muted-foreground leading-relaxed">
                              {sentence.trim()}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {data?.data?.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed rounded-3xl border-muted">
          <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <GitCommit className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No activity found</h3>
          <p className="text-muted-foreground">
            No commits have been summarized in the selected time period.
          </p>
        </div>
      )}
    </div>
  );
}

const fetchSummaries = async (dateRange?: DateRange) => {
  if (dateRange?.from && dateRange?.to) {
    const res = await client.api.summaries.range.$get({
      query: {
        start: dateRange.from.toISOString(),
        end: dateRange.to.toISOString(),
      },
    });
    if (!res.ok) throw new Error("Failed to fetch summaries");
    const data = await res.json();
    return data;
  } else {
    const res = await client.api.summaries.weekly.$get();
    if (!res.ok) throw new Error("Failed to fetch summaries");
    const data = await res.json();
    return data;
  }
};
