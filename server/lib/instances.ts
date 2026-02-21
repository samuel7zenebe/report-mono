import { Octokit } from "octokit";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { configDotenv } from "dotenv";

configDotenv();

const githubToken = process.env.ORG_GITHUB_TOKEN_ACCESS!;

console.log("Token", githubToken);

export const octokit = new Octokit({
  auth: githubToken,
});

export const googleAi = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});
