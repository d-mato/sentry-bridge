# sentry-bridge

Cloudflare Worker that receives Sentry alert webhooks and forwards them to Slack or Discord, routed per Sentry project.

Sentry's Developer plan has no Slack or Discord integration, but Internal Integration webhooks are available on every plan. One integration fans out to every project, so this Worker maps `data.event.project` to a destination webhook held in KV, falling back to `FALLBACK_DESTINATION_URL` when a project has no mapping.

- `src/sentry.ts` — webhook receiver: signature check, routing, delivery
- `src/admin.ts` — mapping create/delete behind `Authorization: Bearer $ADMIN_TOKEN`
- `src/formatters/` — Slack Block Kit and Discord embed payloads

The contract is specified by the tests rather than by this file: `pnpm test`.

## Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/d-mato/sentry-bridge)

The button clones this repository, provisions the `PROJECTS` KV namespace, and prompts for the secrets listed in [`.dev.vars.example`](.dev.vars.example). Two steps stay manual afterwards:

1. Create a Sentry [internal integration](https://docs.sentry.io/organization/integrations/integration-platform/internal-integration/) with its webhook URL set to `https://<worker>/sentry`, and set the integration's client secret as `SENTRY_CLIENT_SECRET`.
2. Add a mapping for each Sentry project you want routed — see [Operations](#operations).

## Operations

```sh
pnpm exec wrangler secret list
pnpm exec wrangler kv key list --binding PROJECTS --remote
pnpm deploy
```

`projectId` is Sentry's internal numeric project ID — the value of `data.event.project`, also visible in the `routing unknown project to fallback` log line.

```sh
curl -X POST https://<worker>/admin/projects \
  -H "authorization: Bearer $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"projectId":"1234567","destinationUrl":"https://hooks.slack.com/services/..."}'
```

There is no update endpoint. To change a destination, DELETE then POST.

## Development

```sh
pnpm dev        # reads secrets from .dev.vars, see .dev.vars.example
pnpm test
pnpm typecheck
pnpm check
```

## Notes

- `/admin/*` is a single static bearer token with no rate limiting. An unset `ADMIN_TOKEN` rejects every request rather than allowing them.
- [Preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/) are public by default and share the Worker's bindings, so every deployed version exposes the same endpoints.

## License

ISC. See [LICENSE](LICENSE).
