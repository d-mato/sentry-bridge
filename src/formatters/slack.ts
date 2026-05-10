import type { KnownBlock } from "@slack/types";
import type { SentryEvent } from "../types";
import { clamp, pickTitle, tagValue } from "./util";

export type SlackWebhookBody = {
  text: string;
  blocks: KnownBlock[];
};

export function formatSlack(event: SentryEvent): SlackWebhookBody {
  const title = pickTitle(event);
  const env = tagValue(event.tags, "environment");
  const level = event.level ?? "n/a";
  const subtitle = event.occurrence?.subtitle ?? event.culprit;

  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: clamp(`🚨 ${title}`, 150) },
    },
  ];

  if (subtitle) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: clamp(subtitle, 3000) },
    });
  }

  blocks.push({
    type: "section",
    fields: [
      { type: "mrkdwn", text: `*Env*\n${env ?? "n/a"}` },
      { type: "mrkdwn", text: `*Level*\n${level}` },
      { type: "mrkdwn", text: `*Release*\n${event.release ?? "n/a"}` },
      { type: "mrkdwn", text: `*Platform*\n${event.platform ?? "n/a"}` },
      {
        type: "mrkdwn",
        text: `*Transaction*\n${event.transaction ?? "n/a"}`,
      },
    ],
  });

  if (event.web_url) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `<${event.web_url}|View in Sentry>` },
    });
  }

  return {
    text: clamp(`[${level}] ${title}`, 3000),
    blocks,
  };
}
