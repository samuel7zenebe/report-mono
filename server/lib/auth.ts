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
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: "common",
      scope: [
        "Files.ReadWrite",
        "User.Read",
        "offline_access",
        "openid",
        "profile",
        "email",
      ],
    },
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET, // Use env var in prod
});
