import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { octokit } from "@/server/lib/instances";
import { commitsRoute } from "./repo/commits";

export const timeSchema = z.enum(["DAY", "WEEK", "MONTH", "YEAR"]);

export const getReportSchema = z.object({
  time: timeSchema,
});

const ReposRoute = new Hono()
  .route("/commits", commitsRoute)
  .get("/:owner/:repo", async (c) => {
    const { owner, repo } = c.req.param();
    try {
      // Get basic repository information
      const result = await octokit.rest.repos.get({
        owner,
        repo,
      });
      return c.json(result.data);
    } catch (error) {
      console.error("Error fetching repo info:", error);
      return c.json({ error: "Failed to fetch repository information" }, 500);
    }
  })
  .get("/:owner/:repo/issues", async (c) => {
    const { owner, repo } = c.req.param();
    try {
      // Get issues for the repository
      const result = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        per_page: 2,
      });
      return c.json(result.data);
    } catch (error) {
      console.error("Error fetching issues:", error);
      return c.json({ error: "Failed to fetch issues" }, 500);
    }
  })
  .get("/organization-repos", async (c) => {
    try {
      // Get organization repositories
      const result = await octokit.rest.repos.listForOrg({
        org: Bun.env.GITHUB_ORG!,
        per_page: 5,
      });

      return c.json(result.data);
    } catch (error) {
      console.error("Error fetching organization repositories:", error);
      return c.json(
        { error: "Failed to fetch organization repositories" },
        500
      );
    }
  })
  .get("/:owner/:repo/commits-count", async (c) => {
    const { owner, repo } = c.req.param();
    try {
      const result = await octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 1,
      });

      // The 'link' header contains pagination info. The 'last' relation tells us the total number of pages.
      // Since per_page=1, the last page number is the total commit count.
      const linkHeader = result.headers.link;
      let commitCount = 0;

      if (linkHeader && typeof linkHeader === "string") {
        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (match && match[1]) {
          commitCount = parseInt(match[1], 10);
        } else {
          // If there's only one page, we just count the items in this result
          commitCount = result.data.length;
        }
      } else {
        commitCount = result.data.length;
      }

      return c.json({ count: commitCount });
    } catch (error) {
      console.error("Error fetching commit count:", error);
      return c.json({ error: "Failed to fetch commit count" }, 500);
    }
  })
  .get("/:owner/:repo/latest-commit", async (c) => {
    const { owner, repo } = c.req.param();
    try {
      // 1. Get the latest commit SHA
      const listResult = await octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 1,
      });

      const latestCommit = listResult.data[0];
      if (!latestCommit) {
        return c.json({ error: "No commits found" }, 404);
      }

      const sha = latestCommit.sha;

      // 2. Get full commit details (including files and stats)
      const commitResult = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: sha,
      });
      return c.json(commitResult.data);
    } catch (error) {
      console.error("Error fetching latest commit details:", error);
      return c.json({ error: "Failed to fetch latest commit details" }, 500);
    }
  })
  .get(
    "/:owner/:repo/summary",
    zValidator("query", getReportSchema),
    async (c) => {
      const { owner, repo } = c.req.param();
      c.req.valid("query"); // Validate but don't use 'time' for now

      try {
        const repoDetails = await octokit.rest.repos.get({
          owner,
          repo,
        });

        return c.json(repoDetails.data);
      } catch (error) {
        console.error("Error fetching repo summary:", error);
        return c.json({ error: "Failed to fetch repository summary" }, 500);
      }
    }
  );

export { ReposRoute };
