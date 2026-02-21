import { Hono } from "hono";
import { auth } from "./lib/auth";
import { cors } from "hono/cors";
import { ReportsRoute } from "./routes/reports";
import { ReposRoute } from "./routes/repos";
import { configDotenv } from "dotenv";
import { summaryRoute } from "./routes/summary";
import { commitsRouter } from "./routes/commits";
import { octokit } from "./lib/instances";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { commit as CommitSchema } from "./db/schema";
import { excelRouter } from "./routes/excel";

export const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

configDotenv();

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:5000"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.onError((err, c) => {
  console.log(c.req.path + " =====> " + err.message);
  return c.json({
    success: false,
    error: {
      message: err.message,
      name: err.name,
      cause: err.cause,
      status: c.res.status,
    },
  });
});

app.notFound((c) => {
  return c.json({
    message: "No page was found.",
  });
});

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});

const sampleHTML = `
 <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Hono Backend API</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f9fafb;
      color: #111827;
    }

    header {
      background: #111827;
      color: white;
      padding: 30px 20px;
      text-align: center;
    }

    main {
      max-width: 900px;
      margin: 40px auto;
      padding: 0 20px;
    }

    section {
      background: white;
      padding: 25px;
      margin-bottom: 25px;
      border-radius: 10px;
      box-shadow: 0 10px 20px rgba(0,0,0,0.05);
    }

    h2 {
      margin-top: 0;
    }

    ul {
      line-height: 1.7;
    }

    .tech-stack {
      display: flex;
      gap: 30px;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
    }

    .tech {
      text-align: center;
    }

    .tech img {
      width: 64px;
      height: 64px;
      object-fit: contain;
      margin-bottom: 8px;
    }

    footer {
      text-align: center;
      padding: 20px;
      color: #6b7280;
    }
  </style>
</head>
<body>

  <header>
    <h1>Hono Backend API</h1>
    <p>High-performance API services for report generation</p>
  </header>

  <main>
    <section>
      <h2>About the Backend</h2>
      <p>
        This backend is built using <strong>Hono</strong>, a fast and lightweight
        web framework. It exposes API endpoints responsible for generating,
        validating, and delivering reports.
      </p>
      <p>
        The system focuses on performance, type safety, and clean validation
        while running on modern JavaScript runtimes.
      </p>
    </section>

    <section>
      <h2>API Capabilities</h2>
      <ul>
        <li>Generate reports via REST APIs</li>
        <li>Validate input data using schemas</li>
        <li>Return structured JSON responses</li>
        <li>Optimized for speed and scalability</li>
      </ul>
    </section>

    <section>
      <h2>Technology Stack</h2>
      <div class="tech-stack">
        <div class="tech">
          <img src="https://hono.dev/images/logo.svg" alt="Hono Logo">
          <div>Hono</div>
        </div>

        <div class="tech">
          <img src="https://raw.githubusercontent.com/remojansen/logo.ts/master/ts.png" alt="TypeScript Logo">
          <div>TypeScript</div>
        </div>

        <div class="tech">
          <img src="https://zod.dev/_next/image?url=%2Flogo%2Flogo-glow.png&w=256&q=100" alt="Zod Logo">
          <div>Zod</div>
        </div>

        <div class="tech">
          <img src="https://bun.sh/logo.svg" alt="Bun Logo">
          <div>Bun</div>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <p>© 2026 Hono API Backend</p>
  </footer>

</body>
</html>

`;

app.get("/", (c) => {
  console.log(" Homepage of the Back End Database.");
  return c.html(sampleHTML);
});

app.get("/test", async (c) => {
  const allCommits = await octokit.rest.repos.listCommits({
    owner: "MCF-PLC",
    repo: "ts-front",
  });

  const commitData: Array<{ sha: string; isAvailable: boolean }> = [];

  for (let commit of allCommits.data) {
    const isAvailable = await db
      .select()
      .from(CommitSchema)
      .where(eq(CommitSchema.commitSha, commit.sha));

    commitData.push({
      sha: commit.sha,
      isAvailable: isAvailable.length > 0,
    });
  }
  return c.json({
    total: allCommits.data.length,
    data: commitData,
  });
});

// Api ::::::; Reports
const apiRoutes = new Hono()
  .route("/reports", ReportsRoute)
  .route("/repos", ReposRoute)
  .route("/commits", commitsRouter)
  .route("/summaries", summaryRoute)
  .route("/excel", excelRouter);

const routes = app.route("/api", apiRoutes);

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

export type AppType = typeof routes;
