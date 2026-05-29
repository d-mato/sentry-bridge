import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import app from "./index";

const TOKEN = "test-admin-token";
const auth = { authorization: `Bearer ${TOKEN}` };

async function post(body: unknown, headers: Record<string, string> = auth) {
  return app.request(
    "/admin/projects",
    {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    },
    env,
  );
}

beforeEach(async () => {
  await env.PROJECTS.delete("project:777");
});

describe("admin auth", () => {
  it("rejects a missing token", async () => {
    const res = await post(
      {
        projectId: "777",
        destinationUrl: "https://discord.com/api/webhooks/1/x",
      },
      {},
    );
    expect(res.status).toBe(401);
  });

  it("rejects a wrong token", async () => {
    const res = await post(
      {
        projectId: "777",
        destinationUrl: "https://discord.com/api/webhooks/1/x",
      },
      { authorization: "Bearer nope" },
    );
    expect(res.status).toBe(401);
  });
});

describe("POST /admin/projects", () => {
  it("creates a project and persists it", async () => {
    const res = await post({
      projectId: "777",
      destinationUrl: "https://discord.com/api/webhooks/1/x",
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      projectId: string;
      destinationUrl: string;
    };
    expect(json.projectId).toBe("777");
    expect(await env.PROJECTS.get("project:777")).not.toBeNull();
  });

  it("returns 409 for a duplicate projectId", async () => {
    const body = {
      projectId: "777",
      destinationUrl: "https://discord.com/api/webhooks/1/x",
    };
    expect((await post(body)).status).toBe(201);
    expect((await post(body)).status).toBe(409);
  });

  it("rejects a non-numeric projectId", async () => {
    const res = await post({
      projectId: "abc",
      destinationUrl: "https://discord.com/api/webhooks/1/x",
    });
    expect(res.status).toBe(400);
  });

  it("rejects a disallowed host", async () => {
    const res = await post({
      projectId: "777",
      destinationUrl: "https://evil.example.com/webhook",
    });
    expect(res.status).toBe(400);
  });

  it("rejects a non-https url", async () => {
    const res = await post({
      projectId: "777",
      destinationUrl: "http://hooks.slack.com/services/T/B/X",
    });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /admin/projects/:projectId", () => {
  it("deletes a project", async () => {
    await post({
      projectId: "777",
      destinationUrl: "https://discord.com/api/webhooks/1/x",
    });
    const res = await app.request(
      "/admin/projects/777",
      { method: "DELETE", headers: auth },
      env,
    );
    expect(res.status).toBe(204);
    expect(await env.PROJECTS.get("project:777")).toBeNull();
  });
});
