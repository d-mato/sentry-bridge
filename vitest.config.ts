import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          ADMIN_TOKEN: "test-admin-token",
          SENTRY_CLIENT_SECRET: "test-secret",
          FALLBACK_DESTINATION_URL: "https://hooks.slack.com/services/FALLBACK",
        },
      },
    }),
  ],
});
