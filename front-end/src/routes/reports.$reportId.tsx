import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reports/$reportId")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const data = await fetch(
      `https://jsonplaceholder.typicode.com/posts/${params.reportId}`
    );
    const jsonData = await data.json();
    return jsonData;
  },
});

function RouteComponent() {
  const data: { title: string } = Route.useLoaderData();
  return <div>{data.title}</div>;
}
