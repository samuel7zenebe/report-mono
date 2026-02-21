import { Hono } from "hono";
import { Octokit } from "octokit";
import { GoogleGenAI } from "@google/genai";
import { octokit } from "@/server/lib/instances";

const ai = new GoogleGenAI({});


export const commitsRoute = new Hono()
  .get("/:owner/:repo", async (c) => {
    const { owner = "MCF-PLC", repo } = c.req.param();
    const oneWeekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    try {
      const result = await octokit.rest.repos.listCommits({
        owner,
        repo,
        since: oneWeekAgo,
        per_page: 100,
      });

      if (!result.data[0]) {
        return c.json({ error: "No commits found" }, 404);
      }

      const firstCommit = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: result.data[0].sha,
      });

      const firstCommitFiles = firstCommit.data.files ?? [];

      const diff = firstCommitFiles
        .filter((f) => f.patch) // patch may be missing for binaries / large files
        .map((f) => {
          return `
    File: ${f.filename}
    Status: ${f.status}
    Changes:
    ${f.patch}
        `.trim();
        })
        .join("\n\n");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `this is the diff of a repositoy. give me a summary of what happened: ${diff}`,
      });
      console.log(response.text);
      return c.json(response.text);
    } catch (error) {
      console.error("Error fetching commits:", error);
      return c.json({ error: "Failed to fetch commits" }, 500);
    }
  })
  .get("/all-repos", async (c) => {
    // commits of kms-front-end
    const allReposList = await octokit.rest.repos.listForAuthenticatedUser({
      type: "owner",
    });
    return c.json(allReposList);
  });
