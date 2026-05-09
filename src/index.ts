import { Hono } from "hono";

type Bindings = Record<string, never>;

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("ok"));

export default app;
