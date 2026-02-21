import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/api-route";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  FileText,
  ExternalLink,
  GitCommit,
  CalendarDays,
  UserCircle,
  ChevronRight,
  Home,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/repos/$owner/$repo/commits")({
  component: RouteComponent,
});

function RouteComponent() {
  const { owner, repo } = Route.useParams();

  const {
    data: commitsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["commits", owner, repo],
    queryFn: async () => {
      const res = await client.api.commits[":repo"][":owner"].$get({
        param: { repo, owner },
      });
      if (!res.ok) throw new Error("Failed to fetch commits");
      return await res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
        <p className="text-muted-foreground font-medium animate-pulse">
          Loading commit history...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
        <div className="rounded-full bg-destructive/10 p-4">
          <FileText className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Failed to load commits
        </h3>
        <p className="text-muted-foreground max-w-md">{error.message}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4 bg-muted/30 w-fit px-4 py-2 rounded-full border border-border/40">
        <Link
          to="/"
          className="flex items-center hover:text-primary transition-colors gap-1.5"
        >
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
        <ChevronRight className="h-4 w-4 opacity-50" />
        <Link
          to="/repos"
          className="flex items-center hover:text-primary transition-colors gap-1.5"
        >
          <Database className="h-3.5 w-3.5" />
          Repositories
        </Link>
        <ChevronRight className="h-4 w-4 opacity-50" />
        <div className="flex items-center gap-1.5 text-foreground font-medium">
          <GitCommit className="h-3.5 w-3.5" />
          <span className="truncate max-w-[120px] md:max-w-none">{repo}</span>
        </div>
      </nav>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-linear-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Commit History
          </h1>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-colors px-3 py-1"
            >
              {owner}
            </Badge>
            <span className="text-muted-foreground/30 font-light text-xl">
              /
            </span>
            <span className="font-semibold text-xl tracking-tight text-foreground/90">
              {repo}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-12 w-px bg-border/40 hidden md:block" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-1">
              Total Logs
            </span>
            <Badge
              variant="secondary"
              className="px-5 py-2 text-base font-mono shadow-sm bg-background border border-border/40"
            >
              {commitsData?.total || 0}
            </Badge>
          </div>
        </div>
      </div>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-border before:to-transparent">
        {commitsData?.data?.map((commit: Commit, index: number) => (
          <CommitItem
            key={commit.sha}
            commit={commit}
            owner={owner}
            repo={repo}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  html_url: string;
  summary: string | null;
}

function CommitItem({
  commit,
  owner,
  repo,
  index,
}: {
  commit: Commit;
  owner: string;
  repo: string;
  index: number;
}) {
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api.summaries.generate.$post({
        json: { owner, repo, sha: commit.sha },
      });
      if (!res.ok) throw new Error("Failed to generate summary");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commits", owner, repo] });
    },
  });

  return (
    <div
      className={cn(
        "relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group",
        "animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Timeline Dot */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform group-hover:scale-110 group-hover:border-primary/50">
        <GitCommit className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>

      {/* Card Content */}
      <Card
        className={cn(
          "w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] shadow-none border-border/60 bg-card/50 backdrop-blur-sm transition-all hover:shadow-lg hover:border-primary/20",
          "group-hover:-translate-y-1 duration-300",
        )}
      >
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <h3
                className="font-semibold text-lg leading-snug tracking-tight line-clamp-2"
                title={commit.message}
              >
                {commit.message}
              </h3>
              <a
                href={commit.html_url}
                target="_blank"
                rel="noreferrer"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded-md shrink-0"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <UserCircle className="h-3.5 w-3.5" />
                <span className="font-medium">{commit.author}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                <time dateTime={commit.date}>
                  {new Date(commit.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>
              <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider">
                {commit.sha.substring(0, 7)}
              </code>
            </div>
          </div>

          <div className="pt-2">
            {commit.summary ? (
              <div className="relative overflow-hidden rounded-lg bg-secondary/30 p-4 border border-border/50">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-green-500 to-emerald-600" />
                <p className="text-sm text-foreground/90 leading-relaxed font-normal">
                  {commit.summary}
                </p>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2 h-9 font-medium transition-all hover:bg-primary hover:text-primary-foreground"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating analysis...
                  </>
                ) : (
                  <>
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                    AI Summarize Change
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
