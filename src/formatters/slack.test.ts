import { describe, expect, it } from "vitest";
import type { SentryEvent } from "../types";
import { formatSlack } from "./slack";

const event: SentryEvent = {
  title: "TypeError: x is undefined",
  level: "error",
  platform: "javascript",
  release: "1.2.3",
  transaction: "GET /api/users",
  culprit: "app/handler",
  web_url: "https://sentry.io/issues/1",
  tags: [["environment", "production"]],
};

describe("formatSlack", () => {
  it("uses a header block with the title", () => {
    const body = formatSlack(event);
    expect(body.blocks[0]).toMatchObject({
      type: "header",
      text: { type: "plain_text", text: "🚨 TypeError: x is undefined" },
    });
  });

  it("sets fallback text including the level", () => {
    expect(formatSlack(event).text).toBe("[error] TypeError: x is undefined");
  });

  it("renders environment from tags", () => {
    const fields = formatSlack(event).blocks.find(
      (b) => b.type === "section" && "fields" in b,
    );
    expect(JSON.stringify(fields)).toContain("production");
  });

  it("omits the Sentry link block when web_url is absent", () => {
    const { web_url, ...noUrl } = event;
    const body = formatSlack(noUrl);
    expect(JSON.stringify(body.blocks)).not.toContain("View in Sentry");
  });
});
