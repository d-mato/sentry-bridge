import type { SentryEvent } from "../types";

export function tagValue(
  tags: SentryEvent["tags"],
  key: string,
): string | null {
  if (!tags) return null;
  for (const entry of tags) {
    if (entry?.[0] === key) return entry[1] ?? null;
  }
  return null;
}

export function pickTitle(event: SentryEvent): string {
  const t = event.title?.trim();
  if (t && t !== "<untitled>") return t;
  const md = event.metadata;
  if (md?.type && md.value) return `${md.type}: ${md.value}`;
  if (event.message) return event.message;
  return "(no title)";
}

export function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}
