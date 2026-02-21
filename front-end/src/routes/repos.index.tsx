import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/api-route";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Star,
  GitFork,
  Info,
  ExternalLink,
  MessageSquare,
  Clock,
  History,
  FileText,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export const Route = createFileRoute("/repos/")({
  component: RouteComponent,
});

interface GitHubIssue {
  id: number;
  title: string;
  state: string;
  created_at: string;
  html_url: string;
  comments: number;
  user: {
    login: string;
  } | null;
}

function CommitCount({ owner, repo }: { owner: string; repo: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["commits-count", owner, repo],
    queryFn: async () => {
      const res = await client.api.repos[":owner"][":repo"][
        "commits-count"
      ].$get({
        param: { owner, repo },
      });
      if (!res.ok) return 0;
      const json = await res.json();
      return json.count;
    },
  });

  if (isLoading)
    return <span className="animate-pulse bg-muted h-4 w-8 rounded" />;

  return <span>{data || 0} commits</span>;
}

interface GitHubFile {
  filename: string;
  additions: number;
  deletions: number;
}

function CommitSummary({ owner, repo }: { owner: string; repo: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["latest-commit-summary", owner, repo],
    queryFn: async () => {
      const res = await client.api.repos[":owner"][":repo"][
        "latest-commit"
      ].$get({
        param: { owner, repo },
      });
      if (!res.ok) throw new Error("Failed to fetch summary");
      return await res.json();
    },
    enabled: isOpen,
  });

  return (
    <div className="mt-4 border-t pt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        {isOpen ? (
          <ChevronUp className="size-4" />
        ) : (
          <ChevronDown className="size-4" />
        )}
        {isOpen ? "Hide Latest Change Summary" : "Show Latest Change Summary"}
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-full" />
              <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive"> Could not load summary.</p>
          ) : (
            data &&
            data.stats &&
            data.files && (
              <div className="space-y-3">
                <div className="bg-muted/50 p-3 rounded-lg border">
                  <p className="text-sm font-medium leading-relaxed">
                    {data.commit.message}
                  </p>
                </div>

                <div className="flex gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1 text-green-600 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                    <Plus className="size-3" />
                    {data.stats.additions}
                  </div>
                  <div className="flex items-center gap-1 text-red-600 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                    <Minus className="size-3" />
                    {data.stats.deletions}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground bg-muted px-2 py-1 rounded border">
                    <FileText className="size-3" />
                    {data.files.length} files
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
                    Changed Files
                  </p>
                  {data.files.slice(0, 5).map((file: GitHubFile) => (
                    <div
                      key={file.filename}
                      className="flex items-center justify-between text-xs py-1 border-b last:border-0"
                    >
                      <span className="truncate max-w-[250px] font-mono text-muted-foreground">
                        {file.filename}
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <span className="text-green-600">
                          +{file.additions}
                        </span>
                        <span className="text-red-600">-{file.deletions}</span>
                      </div>
                    </div>
                  ))}
                  {data.files.length > 5 && (
                    <p className="text-[10px] text-muted-foreground italic pt-1">
                      ...and {data.files.length - 5} more files
                    </p>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function RouteComponent() {
  const {
    data: repoInfo,
    isLoading: isLoadingInfo,
    error: errorInfo,
  } = useQuery({
    queryKey: ["repo-info"],
    queryFn: () => fetchRepoInfo("MCF-PLC", "kms-front-end"),
  });

  const {
    data: repoIssues,
    isLoading: isLoadingIssues,
    error: errorIssues,
  } = useQuery({
    queryKey: ["repo-issues"],
    queryFn: () => fetchRepoIssues("MCF-PLC", "kms-front-end"),
  });

  const { data: orgRepos, error: errorOrgRepos } = useQuery({
    queryKey: ["org-repos"],
    queryFn: fetchOrgRepos,
  });

  if (errorInfo || errorIssues || errorOrgRepos) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-destructive text-xl font-semibold">
            Error Loading Data
          </div>
          <p className="text-muted-foreground">
            {(errorInfo || errorIssues)?.message}
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingInfo || isLoadingIssues) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
        <div className="h-32 bg-muted rounded-xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-4">
        {orgRepos && orgRepos?.length > 1 && (
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold">{orgRepos[0]?.owner?.login}</p>
            <Badge variant="secondary" className="font-mono">
              {orgRepos[0]?.owner?.type}
            </Badge>
          </div>
        )}
        <span> There are {orgRepos?.length} repositories.</span>
      </div>
      {/* 
         the organizational repos list 
      */}
      <div className="flex flex-col gap-4">
        {orgRepos?.map((repo) => (
          <div
            key={repo.id}
            className="relative overflow-hidden border bg-card p-8 shadow-sm"
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-3xl font-bold">
                    {repo?.full_name}
                  </CardTitle>
                  <Badge variant="secondary" className="font-mono">
                    {repo?.visibility}
                  </Badge>
                </div>

                <p className="text-lg text-muted-foreground max-w-2xl">
                  {repo?.description || "No description provided."}
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Star className="size-4 text-yellow-500 fill-yellow-500" />
                    {repo?.stargazers_count} stars
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <GitFork className="size-4 text-blue-500" />
                    {repo?.forks_count} forks
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Info className="size-4 text-green-500" />
                    {repo?.open_issues_count} open issues
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <History className="size-4 text-purple-500" />
                    <CommitCount owner={repo.owner.login} repo={repo.name} />
                  </div>
                </div>
                <CommitSummary owner={repo.owner.login} repo={repo.name} />
              </div>
              <div className="flex flex-col gap-2">
                <a
                  href={repo?.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  View on GitHub
                  <ExternalLink className="size-4" />
                </a>
                <button
                  onClick={async () => {
                    const res = await client.api.repos[":owner"][":repo"][
                      "latest-commit"
                    ].$get({
                      param: { owner: repo.owner.login, repo: repo.name },
                    });
                    if (res.ok) {
                      const commit = await res.json();
                      window.open(commit.html_url, "_blank");
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Latest Commit
                  <History className="size-4" />
                </button>
                <Link
                  to="/repos/$owner/$repo/commits"
                  params={{ owner: repo.owner.login, repo: repo.name }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  View Commits
                  <History className="size-4" />
                </Link>
              </div>
            </div>
            {/* Subtle background decoration */}
            <div className="absolute -right-12 -top-12 size-64 rounded-full bg-primary/5 blur-3xl" />
          </div>
        ))}
      </div>
      {/* Repo Header */}

      <div className="relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-3xl font-bold">
                {repoInfo?.full_name}
              </CardTitle>
              <Badge variant="secondary" className="font-mono">
                {repoInfo?.visibility}
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">
              {repoInfo?.description || "No description provided."}
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Star className="size-4 text-yellow-500 fill-yellow-500" />
                {repoInfo?.stargazers_count} stars
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <GitFork className="size-4 text-blue-500" />
                {repoInfo?.forks_count} forks
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Info className="size-4 text-green-500" />
                {repoInfo?.open_issues_count} open issues
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href={repoInfo?.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              View on GitHub
              <ExternalLink className="size-4" />
            </a>
            <button
              onClick={async () => {
                if (!repoInfo) return;
                const res = await client.api.repos[":owner"][":repo"][
                  "latest-commit"
                ].$get({
                  param: { owner: repoInfo.owner.login, repo: repoInfo.name },
                });
                if (res.ok) {
                  const commit = await res.json();
                  window.open(commit.html_url, "_blank");
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Latest Commit
              <History className="size-4" />
            </button>
            <Link
              to="/repos/$owner/$repo/commits"
              params={{
                owner: repoInfo?.owner.login || "",
                repo: repoInfo?.name || "",
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              View Commits
              <History className="size-4" />
            </Link>
          </div>
        </div>
        {repoInfo && (
          <CommitSummary owner={repoInfo.owner.login} repo={repoInfo.name} />
        )}
        {/* Subtle background decoration */}
        <div className="absolute -right-12 -top-12 size-64 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Issues Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Recent Issues</h2>
          <Badge variant="outline" className="px-3 py-1">
            Showing latest {repoIssues?.length}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {repoIssues?.map((issue: GitHubIssue) => (
            <Card
              key={issue.id}
              className="group transition-all hover:shadow-md hover:border-primary/50"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                    {issue.title}
                  </CardTitle>
                  <Badge
                    className={
                      issue.state === "open"
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : "bg-red-500/10 text-red-600 border-red-500/20"
                    }
                  >
                    {issue.state}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 pt-1">
                  <Clock className="size-3" />
                  Opened {new Date(
                    issue.created_at,
                  ).toLocaleDateString()} by {issue.user?.login || "Unknown"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MessageSquare className="size-4" />
                      {issue.comments}
                    </div>
                  </div>
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    Details
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

const fetchRepoInfo = async (owner: string, repo: string) => {
  const res = await client.api.repos[":owner"][":repo"].$get({
    param: {
      owner,
      repo,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch repository info");
  }
  return await res.json();
};

const fetchRepoIssues = async (owner: string, repo: string) => {
  const res = await client.api.repos[":owner"][":repo"].issues.$get({
    param: {
      owner,
      repo,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch issues");
  }
  return await res.json();
};

const fetchOrgRepos = async () => {
  const res = await client.api.repos["organization-repos"].$get({});
  if (!res.ok) {
    throw new Error("failed to fetch organization repo");
  }
  return await res.json();
};
