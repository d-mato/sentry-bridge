import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteProject, getProject, putProject } from "./store";

const record = {
  projectId: "12345",
  destinationUrl: "https://hooks.slack.com/services/T/B/X",
  createdAt: "2026-05-30T00:00:00.000Z",
};

beforeEach(async () => {
  await env.PROJECTS.delete("project:12345");
});

describe("store", () => {
  it("round-trips a record through put and get", async () => {
    await putProject(env.PROJECTS, record);
    expect(await getProject(env.PROJECTS, "12345")).toEqual(record);
  });

  it("stores under a project: prefixed key", async () => {
    await putProject(env.PROJECTS, record);
    const raw = await env.PROJECTS.get("project:12345");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual({
      destinationUrl: record.destinationUrl,
      createdAt: record.createdAt,
    });
  });

  it("returns null for an unknown project", async () => {
    expect(await getProject(env.PROJECTS, "99999")).toBeNull();
  });

  it("removes a record on delete", async () => {
    await putProject(env.PROJECTS, record);
    await deleteProject(env.PROJECTS, "12345");
    expect(await getProject(env.PROJECTS, "12345")).toBeNull();
  });
});
