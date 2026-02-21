import { createFileRoute } from "@tanstack/react-router";
import useReports from "@/hooks/use-reports";
export const Route = createFileRoute("/test")({
  component: RouteComponent,
});

function RouteComponent() {
  const { commitsList } = useReports();
  console.log(commitsList);
  return <div>Hello "/test"! {commitsList?.message}</div>;
}
