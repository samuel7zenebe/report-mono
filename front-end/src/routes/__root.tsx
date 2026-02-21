import * as React from "react";
import { createRootRoute, Outlet, Link } from "@tanstack/react-router";
import { NavLink } from "./-components/nav-link";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { GitBranch, FileText, FolderGit2 } from "lucide-react";
import { UserNav } from "@/components/user-nav";
export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const queryClient = new QueryClient();
  return (
    <React.StrictMode>
      <React.Fragment>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <QueryClientProvider client={queryClient}>
            <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
              <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
                <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center gap-8">
                    <Link
                      to="/"
                      className="flex items-center gap-2 text-xl font-bold tracking-tight transition-opacity hover:opacity-80"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <FolderGit2 className="h-5 w-5" />
                      </div>
                      <span className="bg-linear-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                        DevMono
                      </span>
                    </Link>

                    <div className="hidden md:flex items-center space-x-1">
                      <NavLink
                        to="/repos"
                        className="group relative flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-primary data-[status=active]:bg-primary/10 rounded-full"
                      >
                        <GitBranch className="h-4 w-4" />
                        <span>Repositories</span>
                      </NavLink>
                      <NavLink
                        to="/reports"
                        className="group relative flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-primary data-[status=active]:bg-primary/10 rounded-full"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Summaries</span>
                      </NavLink>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <ModeToggle />
                    <UserNav />
                  </div>
                </div>
              </nav>
              <main className="flex-1 container mx-auto max-w-7xl p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Outlet />
              </main>
            </div>
          </QueryClientProvider>
        </ThemeProvider>
      </React.Fragment>
    </React.StrictMode>
  );
}
