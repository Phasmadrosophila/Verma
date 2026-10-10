# Cloudflare Workers Deployment Guide

This document defines the deployment architecture, configuration, and operational
procedures for hosting **Verma** web assets and the serverless opaque envelope relay
on Cloudflare **Workers with Static Assets**.

> Migration note (issue #79): this replaces the previous Cloudflare Pages deployment
> (`apps/web/wrangler.toml` + `apps/web/functions/[[route]].js`). The old
> `cloudflare-deploy.yml` workflow is retired in favor of
> `.github/workflows/cloudflare-workers-deploy.yml`.

---

## 1. Architecture

A single Worker (`verma-web`) serves the SPA and the relay from one origin. Static
assets are attached to the Worker through the `ASSETS` binding:

```
                        +--------------------------------------------------+
                        |              Cloudflare Global Edge              |
                        |            Worker: verma-web (single origin)     |
                        +--------------------------------------------------+
                                |                               |
                    /health, /api/health              everything else
                    /v1/envelopes*,                   (SPA + assets)
                    /api/v1/envelopes*                     |
                                |                          v
                                v                 +-------------------------------+
                 +----------------------------+   |  Static Assets binding        |
                 | relay/cloudflare-relay.mjs |   |  (apps/web/dist via ASSETS)   |
                 +----------------------------+   +-------------------------------+
                                |
                                v
                 +----------------------------+
                 |  Cloudflare KV Namespace   |
                 |      (VERMA_RELAY_KV)      |
                 +----------------------------+
```

### 1.1 Routing contract (`apps/web/worker/index.mjs`)

- `/health`, `/api/health`, `/v1/envelopes*`, `/api/v1/envelopes*` →
  `handleRelayRequest` in `relay/cloudflare-relay.mjs`.
- Any other `/api/*` → **explicit JSON `503`** `{ "code": "backend_unavailable" }`.
  This is deliberate: the deployed SPA has no vault backend on its origin, and
  previously the static SPA fallback answered `/api/vault/status` with an HTML
  `200`, which made the app hang forever in the `'loading'` state (issue #79).
- Everything else → `env.ASSETS.fetch(request)`, with
  `not_found_handling = "single-page-application"` providing the deep-link fallback.

### 1.2 Frontend fix

`apps/web/src/api.ts` rejects any status response that is not
`application/json`, and `VaultContext` resolves to an explicit `'unavailable'`
state (the `BackendUnavailable` screen with a Retry button) instead of remaining
in `'loading'`.

### 1.3 Relay endpoints (`relay/cloudflare-relay.mjs`)

- `GET /health` / `GET /api/health` — public `200` JSON `{"status":"ok"}`.
- `GET /v1/envelopes` — envelope metadata (`id`, `bytes`) only, never payload contents.
- `POST /v1/envelopes/:id` — stores an opaque binary ciphertext envelope
  (`<= 1 MiB`, `Content-Type: application/octet-stream`, `X-Verma-Envelope-Version: 1`).
- `GET /v1/envelopes/:id` — raw binary ciphertext, `Cache-Control: no-store`.
- Auth: `Authorization: Bearer <RELAY_AUTH_TOKEN>` compared in constant time.
- The relay only ever receives pre-encrypted ciphertext; no plaintext or keys are logged.

---

## 2. Environment & Secret Isolation

| Environment | URL Pattern | KV Namespace (`VERMA_RELAY_KV`) | Secret Access |
|---|---|---|---|
| **Production** | `https://verma-web.<account-subdomain>.workers.dev/` (or custom domain) | Production namespace id | Repository secrets on `main` |
| **Preview (Branch / PR)** | `https://<alias>-verma-web.<account-subdomain>.workers.dev/` | Dedicated preview namespace id | Repository secrets, non-`main` refs |

Preview aliases are created by `wrangler versions upload --preview-alias <alias>`:

- Pull requests use `pr-<number>`.
- Other branches sanitize `GITHUB_REF_NAME` to lowercase `[a-z0-9-]`, collapse
  repeated dashes, prefix `b-` if it does not start with a lowercase letter, and
  truncate so that `alias + "-verma-web" <= 63` characters.
- Aliased version URLs serve only the uploaded version and never production traffic.
  Cloudflare retains the 1000 most recent aliases, so no cleanup job is required.

### Security isolation rules

1. **Fork PR isolation:** repository secrets are not exposed to untrusted forks, so
   `preview-deploy` skips provisioning and deploy when `CLOUDFLARE_API_TOKEN` is empty.
   The workflow is triggered by `pull_request` and **never** `pull_request_target`.
2. **Namespace segregation:** preview deploys rewrite the committed
   `verma_relay_kv_production_id` placeholder to a dedicated **`VERMA_RELAY_KV_preview`**
   namespace id, so preview sync never reads or writes production envelopes.

---

## 3. Step-by-Step Setup

### 3.1 Create a Cloudflare API Token

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **My Profile** → **API Tokens**.
2. **Create Token** → **Create Custom Token**.
3. Name: `Verma CI/CD Deploy Token`.
4. Permissions:
   - `Account` | `Workers Scripts` | **Edit**
   - `Account` | `Workers KV Storage` | **Edit**
   - (`Cloudflare Pages` access is no longer required.)
5. Account Resources: include the target account.
6. Create and copy the token immediately.

### 3.2 Obtain the Account ID

**Workers & Pages** sidebar → **Account ID** → copy.

### 3.3 Enable the workers.dev subdomain

**Workers & Pages** → **Your subdomain** → register a `workers.dev` subdomain if
not already done. Preview and production URLs depend on it unless a custom domain
or route is configured.

### 3.4 Create the KV namespaces

The pipeline is idempotent, but you can pre-create them:

```bash
export CLOUDFLARE_API_TOKEN="<your-api-token>"
export CLOUDFLARE_ACCOUNT_ID="<your-account-id>"

npx --yes wrangler@4.149.0 kv namespace create VERMA_RELAY_KV
npx --yes wrangler@4.149.0 kv namespace create VERMA_RELAY_KV_preview
```

The ids are resolved at deploy time; you do not need to commit them. The committed
`apps/web/wrangler.jsonc` keeps the `verma_relay_kv_production_id` placeholder.

### 3.5 Configure the relay auth token (optional)

```bash
npx --yes wrangler@4.149.0 secret put RELAY_AUTH_TOKEN --name verma-web
```

### 3.6 Configure GitHub Actions repository secrets

**Settings** → **Secrets and variables** → **Actions**:

| Secret Name | Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token from §3.1 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID from §3.2 |

(`CLOUDFLARE_PROJECT_NAME` is no longer used.)

---

## 4. Deployment Workflow

`.github/workflows/cloudflare-workers-deploy.yml` runs on every push, every pull
request, and manual dispatch:

1. **`validate`** — `node --check` on relay/worker/test sources, `node --test tests/relay/*.test.mjs`,
   workspace `check`, `lint`, `test`, `build`, and uploads the `apps/web/dist` artifact.
2. **`preview-deploy`** (non-`main` refs) — provisions the preview KV namespace,
   rewrites the config placeholder, runs `wrangler versions upload --preview-alias <alias>`,
   captures the alias URL from `Version Preview Alias URL:`, and posts/updates a single
   PR comment (hidden `<!-- verma-preview-url -->` marker).
3. **`production-deploy`** (push to `main` only) — provisions the production KV
   namespace, rewrites the placeholder, and runs `wrangler deploy`.

Concurrency is grouped per branch/PR with `cancel-in-progress: true`. Workflow-level
permissions are `contents: read`; only `preview-deploy` adds `pull-requests: write`.

---

## 5. Rollback & Disaster Recovery

### 5.1 Rollback (Cloudflare Dashboard)

**Workers & Pages** → `verma-web` → **Deployments** → pick last known-good → **Rollback**.

### 5.2 Rollback (Wrangler)

```bash
npx --yes wrangler@4.149.0 deployments list --name verma-web
npx --yes wrangler@4.149.0 rollback <deployment-id> --name verma-web

# Or rebuild and redeploy a known-good commit:
git checkout <stable-commit>
pnpm install && pnpm run build
npx --yes wrangler@4.149.0 deploy --config apps/web/wrangler.jsonc
```

### 5.3 Relay emergency lockdown

```bash
npx --yes wrangler@4.149.0 secret put RELAY_AUTH_TOKEN --name verma-web
```

Existing unauthorized connections receive `401 Unauthorized` immediately.

### 5.4 KV disaster recovery

KV holds only ephemeral/replicated encrypted sync envelopes. If lost, paired
devices re-sync directly or re-publish their latest encrypted envelopes. No
plaintext or master keys exist in KV at any time.

---

## 6. Retiring the legacy Pages project

The Pages project is intentionally **not** deleted by this migration. To retire it:

1. Confirm the production Worker URL serves the app (assets + deep links + `/health`).
2. Disable Cloudflare's **Git integration** for the Pages project first — otherwise
   Pages keeps auto-deploying on every push and you get double deploys alongside the
   Workers pipeline.
3. Update any DNS / custom domain that points at Pages to the Worker.
4. Remove the Pages project only after traffic has moved and a rollback window has passed.
