import type { AppType } from "../../server/app";
import { hc } from "hono/client";

export const client = hc<AppType>("/");
