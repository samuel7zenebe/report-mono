import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index"; // your drizzle instance
import * as schema from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  basePath: "/api/auth", // Default path for auth endpoints
  trustedOrigins: [
    "http://localhost:5173",
    "https://vercel-with-neon-postgres-indol-chi.vercel.app/",
  ], // Allow requests from Next.js origin
  socialProviders: {
    github: {
      clientId: "Ov23li4KrnQ2yqsIlUWC",
      clientSecret: "53a56b2b4c9864d74ea45201c0480bc3c55617ad",
    },
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET, // Use env var in prod
});
