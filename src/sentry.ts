import { Hono } from "hono";
import { formatDiscord } from "./formatters/discord";
import { formatSlack } from "./formatters/slack";
import { getProject } from "./store";
import type { SentryEventAlertPayload } from "./types";

type Bindings = {
  PROJECTS: KVNamespace;
  FALLBACK_DESTINATION_URL?: string;
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

  const event = payload.data?.event;
  if (!event || typeof event.project !== "number") {
    return c.text("missing data.event.project", 400);
  }
  const projectId = String(event.project);

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

  const host = new URL(destinationUrl).hostname;
  let body: unknown;
  if (host === "hooks.slack.com") {
    body = formatSlack(event);
  } else if (host === "discord.com") {
    body = formatDiscord(event);
  } else {
    console.error("unsupported destination host", { projectId, host });
    return c.text("unsupported destination host", 500);
  }

  const res = await fetch(destinationUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("destination failed", {
      projectId,
      host,
      status: res.status,
      body: errText.slice(0, 500),
    });
    return c.text("destination failed", 502);
  }

  console.log("delivered", {
    projectId,
    matched: project !== null,
    host,
  });
  return c.text("ok");
});

export default sentry;
