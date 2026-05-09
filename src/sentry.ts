import { Hono } from "hono";
import { getProject } from "./store";

type Bindings = {
  PROJECTS: KVNamespace;
  FALLBACK_DESTINATION_URL?: string;
};

type SentryEventAlertPayload = {
  action?: string;
  data?: {
    event?: {
      project?: number;
    };
  };
};

const sentry = new Hono<{ Bindings: Bindings }>();

sentry.post("/", async (c) => {
  if (c.req.header("sentry-hook-resource") !== "event_alert") {
    return c.text("ignored", 200);
  }

  const rawBody = await c.req.text();

  let payload: SentryEventAlertPayload;
  try {
    payload = JSON.parse(rawBody) as SentryEventAlertPayload;
  } catch {
    return c.text("malformed json", 400);
  }

  if (payload.action !== "triggered") {
    return c.text("ignored", 200);
  }

  const rawProject = payload.data?.event?.project;
  if (typeof rawProject !== "number") {
    return c.text("missing data.event.project", 400);
  }
  const projectId = String(rawProject);

  const project = await getProject(c.env.PROJECTS, projectId);
  let destinationUrl: string;
  if (project) {
    destinationUrl = project.destinationUrl;
  } else {
    const fallback = c.env.FALLBACK_DESTINATION_URL;
    if (!fallback) {
      console.error("unknown project and no fallback configured", {
        projectId,
      });
      return c.text("unknown project; fallback not configured", 500);
    }
    console.warn("routing unknown project to fallback", { projectId });
    destinationUrl = fallback;
  }

  console.log("resolved destination", {
    projectId,
    matched: project !== null,
    host: new URL(destinationUrl).hostname,
  });
  return c.text("ok");
});

export default sentry;
