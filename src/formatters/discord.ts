import type {
  APIEmbed,
  RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import type { SentryEvent } from "../types";
import { clamp, pickTitle, tagValue } from "./util";

const LEVEL_COLORS: Record<string, number> = {
  fatal: 0x991111,
  error: 0xe03e2f,
  warning: 0xe0a82e,
  info: 0x3e63dd,
  debug: 0x808080,
};

function levelToColor(level: string | undefined): number {
  if (!level) return 0x808080;
  return LEVEL_COLORS[level] ?? 0x808080;
}

export function formatDiscord(
  event: SentryEvent,
): RESTPostAPIWebhookWithTokenJSONBody {
  const title = clamp(pickTitle(event), 256);
  const env = tagValue(event.tags, "environment");

  const embed: APIEmbed = {
    title,
    url: event.web_url,
    color: levelToColor(event.level),
    fields: [
      { name: "Env", value: env ?? "n/a", inline: true },
      { name: "Level", value: event.level ?? "n/a", inline: true },
      { name: "Platform", value: event.platform ?? "n/a", inline: true },
      { name: "Release", value: event.release ?? "n/a", inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "Sentry" },
  };

  return { embeds: [embed] };
}
