---
name: docker-best-practices
description: >-
  Project checklist and review guide for writing and reviewing Verma Dockerfile
  and compose.yaml. Use when creating, editing, or reviewing container
  build/deploy files for Verma's self-hosted relay and API service. Covers
  multi-stage builds, pinned bases, pnpm via Corepack, non-root runtime,
  healthchecks, no secrets in layers, and compose specifics.
---

# Docker Best Practices (Verma)

Use this when authoring or reviewing the `Dockerfile`, `.dockerignore`, or
`compose.yaml` for Verma's self-hosted deployment and relay node. Note: the
repository currently also contains a near-duplicate `docker-compose.yaml` (added
by the Cloudflare/Komodo deploy tooling); `compose.yaml` is the canonical
Compose file and the two should be reconciled. TODO(verify): confirm which
Compose file the deploy pipeline actually consumes.

## Dockerfile checklist

- **Multi-stage build.** Separate build stage (install deps, compile/bundle) from a
  minimal runtime stage. Only runtime artifacts and production dependencies land in the final image.
- **Pinned base image.** Pin by tag **and** digest (e.g.,
  `node:22-bookworm-slim@sha256:...` or `alpine:3.20@sha256:...`). Pass it via an `ARG` so stages share it.
- **pnpm via Corepack.** `RUN corepack enable` (matches `packageManager` in `package.json`).
  Install with `pnpm install --frozen-lockfile`.
- **BuildKit cache mounts.** `RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store ...`
  for faster builds. Requires `# syntax=docker/dockerfile:1.7` and BuildKit.
- **Layer ordering.** Copy manifests (`package.json`, `pnpm-lock.yaml`,
  `pnpm-workspace.yaml`, workspace `package.json` files) and install **before** copying
  source code, ensuring dependency layers cache cleanly.
- **Non-root runtime.** Create and own data directories, then switch to non-root (`USER node` or dedicated service user). Never run as root.
- **Process management & signals.** Use `tini` (or `--init`) as PID 1 for clean process and signal handling.
- **Healthcheck.** Include a `HEALTHCHECK` probing the service health endpoint (e.g. `CMD ["node", "-e", "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1))"]` or curl/wget).
- **Metadata & interface.** `EXPOSE` the port, set OCI `LABEL`s, and use **exec-form**
  `ENTRYPOINT`/`CMD` (JSON array syntax `["node", "dist/index.js"]`), never shell form.
- **Zero secrets in any layer.** Never `COPY .env`, never bake private keys, tokens, or recovery material into images. Configuration and secrets come from runtime environment variables.

## .dockerignore checklist

- Exclude `.env` and `.env.*` (preserve `.env.example`), `.git`, `node_modules`,
  `dist`, local DB files (`*.db`, `*.sqlite`), `docs`, `.agents`, `.kiro`, and build logs.
  A minimal build context speeds up builds and avoids leaking local data.

## compose.yaml checklist

- **No `version:` key** (obsolete in modern Compose v2).
- **Environment configuration.** Use `environment:` and `env_file:` with sensible defaults (`${VAR:-default}`) so containers can start safely in local development.
- **Restart policy.** Set `restart: unless-stopped`.
- **Named volumes.** Use named volumes for persistent stateful data (such as encrypted SQLite vault storage or relay queues).
- **Healthcheck.** Mirror the service healthcheck in Compose.
- **No plaintext secrets.** Relay nodes only store encrypted sync payloads and encrypted emergency packages; master keys and secrets never exist on the server.

## Review checklist

1. Base image pinned by digest and shared via `ARG`?
2. Multi-stage build with only production artifacts in the final stage?
3. `--frozen-lockfile` install, BuildKit cache mounts, manifests copied before source?
4. Non-root user, `tini` signal handler, healthcheck, `EXPOSE`, exec-form `CMD`?
5. Zero secrets or local SQLite database files baked into images?
6. Compose file has no obsolete `version:` key, uses sensible env defaults and named volumes?
