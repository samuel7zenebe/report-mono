import { Hono } from "hono";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import dotenv from "dotenv";
import { generateText } from "ai";
import z from "zod";
import { eq, gte, lte, and } from "drizzle-orm";
import { db } from "../../db";
import { commit as commitSchema } from "@/server/db/schema";
import { octokit } from "@/server/lib/instances";
import { googleAi } from "@/server/lib/instances";
import { zValidator } from "@hono/zod-validator";

dotenv.config();

const DateRangeSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const summaryRoute = new Hono()
  .get("/check/:sha", async (c) => {
    try {
      const { sha } = c.req.param();
      const summary = await db
        .select()
        .from(commitSchema)
        .where(eq(commitSchema.id, sha));

      if (summary.length === 0) {
        return c.json({ exists: false, summary: null });
      }
      return c.json({ exists: true, summary: summary[0] });
    } catch (error) {
      console.error("Error checking summary:", error);
      return c.json({ error: "Failed to check summary" }, 500);
    }
  })
  .post(
    "/generate",
    zValidator(
      "json",
      z.object({
        owner: z.string(),
        repo: z.string(),
        sha: z.string(),
      }),
    ),
    async (c) => {
      console.log("Hit generate summary : ");
      try {
        const { owner, repo, sha } = c.req.valid("json");

        // Check if already exists
        const existing = await db
          .select()
          .from(commitSchema)
          .where(eq(commitSchema.id, sha));
        if (existing.length > 0) {
          return c.json({ summary: existing[0]?.summary || "" });
        }

        // Fetch commit
        const fullCommit = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: sha,
        });

        const diff = fullCommit?.data?.files
          ?.filter((f) => f.patch)
          .map((f) =>
            `File: ${f.filename}\nStatus: ${f.status}\nChanges:\n${f.patch}`.trim(),
          )
          .join("\n\n");

        if (!diff) {
          return c.json({ error: "No diff found" }, 400);
        }

        const response = await generateText({
          model: googleAi("gemini-2.5-flash"),
          prompt: `Summarize the following diff of a repository.make the summary a sentence separated by period.make it generalized.Just plain text , no markdown or formatting. The DIFF is ${diff}`,
        });

        await db.insert(commitSchema).values({
          date:
            fullCommit.data.commit.committer?.date || new Date().toISOString(),
          summary: response.text,
          repositoryName: repo,
          updatedAt: new Date().toISOString(),
          id: sha,
          commitSha: sha,
        });

        return c.json({ summary: response.text });
      } catch (error) {
        console.error("Error generating summary:", error);
        return c.json({ error: "Failed to generate summary" }, 500);
      }
    },
  )
  .get("/", async (c) => {
    console.log("Hit summaries :");
    try {
      const allCommits = await db.select().from(commitSchema);
      return c.json({
        totalSummaries: allCommits.length,
        data: allCommits,
      });
    } catch (error) {
      console.error("Error fetching summaries:", error);
      return c.json({ error: "Failed to fetch summaries" }, 500);
    }
  })
  .get("/weekly", async (c) => {
    console.log("Hit weekly summaries : ");
    try {
      const weeklyCommits = await db
        .select()
        .from(commitSchema)
        .where(
          gte(
            commitSchema.date,
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          ),
        );
      return c.json({ total: weeklyCommits.length, data: weeklyCommits });
    } catch (error) {
      console.error("Error fetching weekly summaries:", error);
      return c.json({ error: "Failed to fetch weekly summaries" }, 500);
    }
  })
  .get("/filter", async (c) => {
    try {
      const from = c.req.query("from");
      const to = c.req.query("to");

      if (!from || !to) {
        return c.json({ error: "Missing from or to query parameters" }, 400);
      }

      const filteredCommits = await db
        .select()
        .from(commitSchema)
        .where(and(gte(commitSchema.date, from), lte(commitSchema.date, to)));

      return c.json({ total: filteredCommits.length, data: filteredCommits });
    } catch (error) {
      console.error("Error filtering summaries:", error);
      return c.json({ error: "Failed to filter summaries" }, 500);
    }
  })
  .get("/:owner/:repo", async (c) => {
    try {
      // List of all the the repository names
      const { owner, repo } = c.req.param();
      const since = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const allCommits = await octokit.rest.repos.listCommits({
        owner,
        repo,
        since,
      });
      for (const commit of allCommits.data) {
        const commitExists = await db
          .select()
          .from(commitSchema)
          .where(eq(commitSchema.id, commit.sha));

        if (commitExists.length > 0) {
          continue;
        }
        console.log("Fetching full commit of ", commit.sha);
        const fullCommit = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: commit.sha,
        });
        console.log("Full commit fetched");
        const diff = fullCommit?.data?.files
          ?.filter((f) => f.patch) // patch may be missing for binaries / large files
          .map((f) => {
            return `
      File: ${f.filename}
      Status: ${f.status}
      Changes:
      ${f.patch}
          `.trim();
          })
          .join("\n\n");

        console.log("Generating Summary with Gemini for commit :", commit.sha);
        const response = await generateText({
          model: googleAi("gemini-2.5-flash"),
          prompt: `Summarize the following diff of a repository.make the summary a sentence separated by period.make it generalized.Just plain text , no markdown or formatting. The DIFF is ${diff}`,
        });
        // storing in database
        console.log("Recording the commit in database.");
        const recordSummary = await db.insert(commitSchema).values({
          date: commit.commit.committer?.date || new Date().toISOString(),
          summary: response.text,
          repositoryName: repo,
          updatedAt: new Date().toISOString(),
          id: commit.sha,
          commitSha: commit.sha,
        });
      }

      return c.json({
        message:
          "Last 12 days of commits has been summarized and recorded in database.",
      });
    } catch (error) {
      console.error("Error processing repo commits:", error);
      return c.json({ error: "Failed to process repository commits" }, 500);
    }
  })
  .get("/range", zValidator("query", DateRangeSchema), async (c) => {
    try {
      const { end, start } = c.req.valid("query");
      const commits = await db
        .select()
        .from(commitSchema)
        .where(and(gte(commitSchema.date, start), lte(commitSchema.date, end)));
      return c.json({
        total: commits.length,
        data: commits,
      });
    } catch (error) {
      console.error("Error fetching summaries by range:", error);
      return c.json({ error: "Failed to fetch summaries by range" }, 500);
    }
  });
