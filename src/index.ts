import { Hono } from "hono";
import admin from "./admin";

type Bindings = {
  PROJECTS: KVNamespace;
  ADMIN_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("ok"));
app.route("/admin", admin);

export default app;
