import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/test")({
  component: RouteComponent,
});

function RouteComponent() {
  console.log("Hey Baby This is the most recommended way of analyzing data");
  return <h1> Testing Component : </h1>;
}
