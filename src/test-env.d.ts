/// <reference types="@cloudflare/vitest-pool-workers/types" />

declare namespace Cloudflare {
  interface Env {
    PROJECTS: KVNamespace;
    ADMIN_TOKEN: string;
    SENTRY_CLIENT_SECRET: string;
    FALLBACK_DESTINATION_URL?: string;
  }
}
