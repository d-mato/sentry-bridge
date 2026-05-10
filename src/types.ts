export type SentryOccurrence = {
  issueTitle?: string;
  subtitle?: string;
};

export type SentryEvent = {
  event_id?: string;
  title?: string;
  level?: string;
  platform?: string;
  project?: number;
  release?: string | null;
  dist?: string | null;
  message?: string;
  metadata?: { type?: string; value?: string };
  url?: string;
  web_url?: string;
  issue_url?: string;
  issue_id?: string;
  tags?: ReadonlyArray<readonly [string, string]>;
  transaction?: string;
  culprit?: string;
  occurrence?: SentryOccurrence;
};

export type SentryEventAlertPayload = {
  action?: string;
  data?: { event?: SentryEvent };
};
