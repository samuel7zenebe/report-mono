import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { octokit } from "@/server/lib/instances";
import { db } from "@/server/db";
import { commit as commitSchema } from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";

export const commitsRouter = new Hono()
  .get("/", (c) => {
    console.log("Hello ma");
    return c.json({
      message: "hello",
    });
  })
  .get("/rest", (c) => {
    console.log("Accessing the context");
    throw new HTTPException(500, { message: " OH MY GOD " });
    return c.json({
      message: "Hrloo",
    });
  })
  .get("/:repo/:owner", async (c) => {
    const repository = c.req.param("repo");
    const owner = c.req.param("owner");

    if (!repository) {
      throw new HTTPException(403, {
        message: "Repository parameter is required.",
        cause: "User Error",
      });
    }

    try {
      const commitsList = await octokit.rest.repos.listCommits({
        owner: owner || "MCF-PLC",
        repo: repository,
        per_page: 50,
      });

      const commitShas = commitsList.data.map((c) => c.sha);

      const summaries = await db
        .select()
        .from(commitSchema)
        .where(inArray(commitSchema.id, commitShas));

      const summaryMap = new Map(summaries.map((s) => [s.id, s.summary]));

      const commitsWithSummary = commitsList.data.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author?.name,
        date: c.commit.author?.date,
        html_url: c.html_url,
        summary: summaryMap.get(c.sha) || null,
      }));

      return c.json(
        {
          total: commitsList.data.length,
          data: commitsWithSummary,
          success: true,
        },
        {
          status: 200,
        },
      );
    } catch (err) {
      console.log(err);
      throw new HTTPException(500, {
        message: "Internal Server Error",
        cause: "Database Error",
      });
    }
  });
