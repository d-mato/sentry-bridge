import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "./index";
import type { SentryEvent } from "./types";

async function sign(rawBody: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(rawBody),
  );
  return [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function webhookBody(
  event: Partial<SentryEvent>,
  action = "triggered",
): string {
  return JSON.stringify({ action, data: { event } });
}

async function postWebhook(
  rawBody: string,
  opts: { resource?: string; signature?: string; env?: typeof env } = {},
) {
  const signature = opts.signature ?? (await sign(rawBody, "test-secret"));
  return app.request(
    "/sentry",
    {
      method: "POST",
      headers: {
        "sentry-hook-signature": signature,
        "sentry-hook-resource": opts.resource ?? "event_alert",
      },
      body: rawBody,
    },
    opts.env ?? env,
  );
}

async function seedProject(id: string, destinationUrl: string) {
  await env.PROJECTS.put(
    `project:${id}`,
    JSON.stringify({ destinationUrl, createdAt: "2026-05-30T00:00:00.000Z" }),
  );
}

const slackEvent: Partial<SentryEvent> = {
  project: 111,
  title: "Boom",
  level: "error",
  tags: [["environment", "production"]],
  web_url: "https://sentry.io/issues/1",
};

let fetchSpy: ReturnType<typeof vi.fn>;

function lastFetch() {
  const call = fetchSpy.mock.calls.at(-1);
  if (!call) throw new Error("fetch was not called");
  return { url: String(call[0]), init: call[1] as RequestInit };
}

beforeEach(async () => {
  fetchSpy = vi.fn(async () => new Response("ok", { status: 200 }));
  vi.stubGlobal("fetch", fetchSpy);
  await Promise.all([
    env.PROJECTS.delete("project:111"),
    env.PROJECTS.delete("project:222"),
    env.PROJECTS.delete("project:333"),
  ]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sentry webhook guards", () => {
  it("rejects an invalid signature with 401", async () => {
    const res = await postWebhook(webhookBody(slackEvent), {
      signature: "deadbeef",
    });
    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ignores a non event_alert resource with 200", async () => {
    const res = await postWebhook(webhookBody(slackEvent), {
      resource: "installation",
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ignored");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await postWebhook("{not json");
    expect(res.status).toBe(400);
  });

  it("ignores a non-triggered action with 200", async () => {
    const res = await postWebhook(webhookBody(slackEvent, "resolved"));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ignored");
  });

  it("returns 400 when event.project is missing", async () => {
    const res = await postWebhook(webhookBody({ title: "x" }));
    expect(res.status).toBe(400);
  });
});

describe("sentry webhook routing", () => {
  it("formats and delivers to a Slack destination", async () => {
    await seedProject("111", "https://hooks.slack.com/services/T/B/X");
    const res = await postWebhook(webhookBody(slackEvent));
    expect(res.status).toBe(200);
    const { url, init } = lastFetch();
    expect(url).toBe("https://hooks.slack.com/services/T/B/X");
    expect(String(init.body)).toContain("blocks");
    expect(String(init.body)).toContain("Boom");
  });

  it("formats and delivers to a Discord destination", async () => {
    await seedProject("222", "https://discord.com/api/webhooks/1/abc");
    const res = await postWebhook(webhookBody({ ...slackEvent, project: 222 }));
    expect(res.status).toBe(200);
    const { url, init } = lastFetch();
    expect(url).toBe("https://discord.com/api/webhooks/1/abc");
    expect(String(init.body)).toContain("embeds");
  });

  it("routes an unknown project to the fallback destination", async () => {
    const res = await postWebhook(webhookBody(slackEvent));
    expect(res.status).toBe(200);
    expect(lastFetch().url).toBe("https://hooks.slack.com/services/FALLBACK");
  });

  it("returns 500 for an unknown project with no fallback", async () => {
    const res = await postWebhook(webhookBody(slackEvent), {
      env: {
        PROJECTS: env.PROJECTS,
        ADMIN_TOKEN: env.ADMIN_TOKEN,
        SENTRY_CLIENT_SECRET: env.SENTRY_CLIENT_SECRET,
      },
    });
    expect(res.status).toBe(500);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 500 for an unsupported destination host", async () => {
    await seedProject("111", "https://example.com/webhook");
    const res = await postWebhook(webhookBody(slackEvent));
    expect(res.status).toBe(500);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 502 when the destination responds with an error", async () => {
    await seedProject("111", "https://hooks.slack.com/services/T/B/X");
    fetchSpy.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    const res = await postWebhook(webhookBody(slackEvent));
    expect(res.status).toBe(502);
  });
});
