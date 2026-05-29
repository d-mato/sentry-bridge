import { describe, expect, it } from "vitest";
import { verifySentrySignature } from "./verify";

const secret = "test-secret";
const body = '{"action":"triggered"}';

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

describe("verifySentrySignature", () => {
  it("accepts a valid signature", async () => {
    const signature = await sign(body, secret);
    expect(await verifySentrySignature(body, signature, secret)).toBe(true);
  });

  it("rejects a signature made with the wrong secret", async () => {
    const signature = await sign(body, "wrong-secret");
    expect(await verifySentrySignature(body, signature, secret)).toBe(false);
  });

  it("rejects a signature for a tampered body", async () => {
    const signature = await sign(body, secret);
    expect(await verifySentrySignature(`${body} `, signature, secret)).toBe(
      false,
    );
  });

  it("rejects a missing signature", async () => {
    expect(await verifySentrySignature(body, undefined, secret)).toBe(false);
  });

  it("rejects a non-hex signature", async () => {
    expect(await verifySentrySignature(body, "zzzz", secret)).toBe(false);
  });

  it("rejects an odd-length signature", async () => {
    expect(await verifySentrySignature(body, "abc", secret)).toBe(false);
  });
});
