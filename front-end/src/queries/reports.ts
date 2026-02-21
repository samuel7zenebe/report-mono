import { client } from "@/api-route";
export async function allCommits() {
  const res = await client.api.commits.$get();
  if (!res.ok) {
    throw new Error("Failed to fetch commits");
  }
  return await res.json();
}
