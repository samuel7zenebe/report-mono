import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { commit as CommitSchema } from "../db/schema";
import { octokit } from "@/server/lib/instances";
import { db } from "../db";
import { eq } from "drizzle-orm";

const owner = "MCF-PLC";
const repo = "kms-front-end";

const getReportsSchema = z.object({
  title: z.string().optional(),
});

const postReportsSchema = z.object({
  title: z.string().optional(),
});

const ReportsRoute = new Hono()
  .get("/", zValidator("query", getReportsSchema), async (c) => {
    try {
      const allCommits = await db
        .select()
        .from(CommitSchema)
        .where(eq(CommitSchema.repositoryName, "kms-front-end"));
      return c.json({ totalSummaries: allCommits.length, data: allCommits });
    } catch (error) {
      console.error("Error fetching reports:", error);
      return c.json({ error: "Failed to fetch reports" }, 500);
    }
  })
  .post("/", zValidator("form", postReportsSchema), (c) => {
    return c.json({ message: "Reports" });
  })
  .get("/github", async (c) => {
    try {
      const { data } = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: "sdsadsa",
      });
      return c.json(data);
    } catch (error) {
      console.error("Error fetching github commit:", error);
      return c.json({ error: "Failed to fetch github commit" }, 500);
    }
  });

export { ReportsRoute };
