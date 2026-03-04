import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/api-route";
import { authClient } from "@/lib/authClient";
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
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DayPicker from "@/components/ui/day-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  loader: async ({ redirect }) => {
    const session = await authClient.api.getSession();
    if (!session) {
      throw redirect("/");
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [view, setView] = useState<"card" | "list">("card");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Summaries</h1>
            <p className="text-sm text-muted-foreground">
              {dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                : "Last 7 Days"}{" "}
              • {data?.total || 0} commits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DayPicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            className="h-9"
          />

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
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
            <FileSpreadsheet className="h-4 w-4" />
            Export
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={cn("w-4 h-4", isFetching && "animate-spin")}
            />
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
