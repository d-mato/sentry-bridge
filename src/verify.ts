export async function verifySentrySignature(
  rawBody: string,
  signature: string | undefined,
  secret: string,
): Promise<boolean> {
  if (
    !signature ||
    signature.length % 2 !== 0 ||
    !/^[0-9a-fA-F]+$/.test(signature)
  ) {
    return false;
  }
  const sigBytes = hexToBytes(signature);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(rawBody),
  );
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
