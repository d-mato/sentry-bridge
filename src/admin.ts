import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { z } from "zod";
import { deleteProject, getProject, putProject } from "./store";

type Bindings = {
  PROJECTS: KVNamespace;
  ADMIN_TOKEN: string;
};

const ALLOWED_HOSTS = new Set(["hooks.slack.com", "discord.com"]);

const projectInput = z.object({
  projectId: z
    .string()
    .regex(
      /^\d+$/,
      "projectId must be a numeric string (Sentry internal project ID)",
    ),
  destinationUrl: z.url().refine((value) => {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && ALLOWED_HOSTS.has(parsed.hostname);
  }, "destinationUrl must be https and host must be hooks.slack.com or discord.com"),
});

const admin = new Hono<{ Bindings: Bindings }>();

admin.use("*", async (c, next) => {
  const middleware = bearerAuth({ token: c.env.ADMIN_TOKEN });
  return middleware(c, next);
});

admin.post("/projects", zValidator("json", projectInput), async (c) => {
  const { projectId, destinationUrl } = c.req.valid("json");
  const existing = await getProject(c.env.PROJECTS, projectId);
  if (existing) {
    return c.json({ error: "projectId already exists" }, 409);
  }
  const record = {
    projectId,
    destinationUrl,
    createdAt: new Date().toISOString(),
  };
  await putProject(c.env.PROJECTS, record);
  return c.json(record, 201);
});

admin.delete("/projects/:projectId", async (c) => {
  await deleteProject(c.env.PROJECTS, c.req.param("projectId"));
  return c.body(null, 204);
});

export default admin;
