import { app } from "./app";
const server = Bun.serve({
  port: process.env.PORT ?? 5000,
  fetch: app.fetch,
  idleTimeout: 60,
});

console.log(`Listening on ${server.url}`);
