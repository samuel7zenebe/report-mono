import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
        Habibi , Welcome To Dubai
      </h1>

      <p className="text-xl text-muted-foreground max-w-[600px]">
        This is a modern, responsive dashboard built with React, TanStack
        Router, and Tailwind CSS.
      </p>
    </div>
  );
}
