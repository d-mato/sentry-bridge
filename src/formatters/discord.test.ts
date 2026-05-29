import { describe, expect, it } from "vitest";
import type { SentryEvent } from "../types";
import { formatDiscord } from "./discord";

const event: SentryEvent = {
  title: "TypeError: x is undefined",
  level: "warning",
  platform: "javascript",
  release: "1.2.3",
  transaction: "GET /api/users",
  culprit: "app/handler",
  web_url: "https://sentry.io/issues/1",
  tags: [["environment", "production"]],
};

describe("formatDiscord", () => {
  it("produces a single embed with title and url", () => {
    const embed = formatDiscord(event).embeds?.[0];
    expect(embed).toMatchObject({
      title: "TypeError: x is undefined",
      url: "https://sentry.io/issues/1",
    });
  });

  it("maps the level to its color", () => {
    expect(formatDiscord(event).embeds?.[0]?.color).toBe(0xe0a82e);
  });

  it("falls back to grey for an unknown level", () => {
    expect(formatDiscord({ ...event, level: "n/a" }).embeds?.[0]?.color).toBe(
      0x808080,
    );
  });

  it("renders environment from tags", () => {
    const fields = formatDiscord(event).embeds?.[0]?.fields;
    expect(fields).toContainEqual({
      name: "Env",
      value: "production",
      inline: true,
    });
  });
});
