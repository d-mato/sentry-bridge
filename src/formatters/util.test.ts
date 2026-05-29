import { describe, expect, it } from "vitest";
import type { SentryEvent } from "../types";
import { clamp, pickTitle, tagValue } from "./util";

describe("tagValue", () => {
  const tags = [
    ["environment", "production"],
    ["server_name", "web-1"],
  ] as const;

  it("returns the matching tag value", () => {
    expect(tagValue(tags, "environment")).toBe("production");
  });

  it("returns null for a missing key", () => {
    expect(tagValue(tags, "release")).toBeNull();
  });

  it("returns null when tags are undefined", () => {
    expect(tagValue(undefined, "environment")).toBeNull();
  });
});

describe("pickTitle", () => {
  it("prefers occurrence issueTitle", () => {
    const event: SentryEvent = {
      occurrence: { issueTitle: "Occurrence title" },
      title: "Event title",
    };
    expect(pickTitle(event)).toBe("Occurrence title");
  });

  it("falls back to title when not <untitled>", () => {
    expect(pickTitle({ title: "Boom" })).toBe("Boom");
  });

  it("skips <untitled> and uses metadata", () => {
    const event: SentryEvent = {
      title: "<untitled>",
      metadata: { type: "TypeError", value: "x is undefined" },
    };
    expect(pickTitle(event)).toBe("TypeError: x is undefined");
  });

  it("falls back to message", () => {
    expect(pickTitle({ message: "something happened" })).toBe(
      "something happened",
    );
  });

  it("uses a placeholder when nothing is available", () => {
    expect(pickTitle({})).toBe("(no title)");
  });
});

describe("clamp", () => {
  it("leaves short strings untouched", () => {
    expect(clamp("hello", 10)).toBe("hello");
  });

  it("truncates with an ellipsis", () => {
    expect(clamp("hello world", 5)).toBe("hell…");
  });
});
