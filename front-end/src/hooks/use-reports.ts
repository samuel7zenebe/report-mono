import { useQuery } from "@tanstack/react-query";
import { allCommits } from "@/queries/reports";

export default function useReports() {
  const { data: commitsList } = useQuery({
    queryKey: ["all-commits"],
    queryFn: () => allCommits(),
  });

  return {
    commitsList,
  };
}
