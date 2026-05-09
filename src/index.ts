import { Hono } from "hono";
import admin from "./admin";
import sentry from "./sentry";

type Bindings = {
  PROJECTS: KVNamespace;
  ADMIN_TOKEN: string;
  SENTRY_CLIENT_SECRET: string;
  FALLBACK_DESTINATION_URL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("ok"));
app.route("/admin", admin);
app.route("/sentry", sentry);

export default app;
