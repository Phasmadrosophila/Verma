---
name: docker-best-practices
description: >-
  Project checklist and review guide for writing and reviewing the PhasmaFrame
  Dockerfile and docker-compose.yaml. Use when creating, editing, or reviewing
  container build/deploy files, or preparing the Komodo Stack. Covers multi-stage
  builds, pinned bases, pnpm via Corepack, non-root runtime, healthchecks, no
  secrets in layers, and compose/Komodo specifics.
---

# Docker best practices (PhasmaFrame)

Use this when authoring or reviewing the `Dockerfile`, `.dockerignore`, or
`docker-compose.yaml`. The repo's working examples already follow this; keep them in sync.

## Dockerfile checklist

- **Multi-stage build.** Separate build (install deps, generate client, bundle) from a
  minimal runtime stage. Only runtime artifacts land in the final image.
- **Pinned base image.** Pin by tag **and** digest (e.g.
  `node:22-bookworm-slim@sha256:...`). Pass it via an `ARG` so both stages share it.
- **pnpm via Corepack.** `RUN corepack enable` (uses the version in `package.json`
  `packageManager`). Install with `pnpm install --frozen-lockfile`.
- **BuildKit cache mounts.** `RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store ...`
  for a warm store. Requires `# syntax=docker/dockerfile:1.7` and BuildKit.
- **Layer ordering.** Copy manifests (`package.json`, `pnpm-lock.yaml`,
  `pnpm-workspace.yaml`, each workspace `package.json`) and install **before** copying
  sources, so dependency layers cache independently of code changes.
- **Self-contained bundle.** For a pnpm monorepo, `pnpm --filter <app> deploy --legacy
  <out>` produces a flattened `node_modules`. Generate the Prisma client **inside** that
  bundle (`cd <out> && pnpm exec prisma generate`) so the engine ships.
- **Prisma engine target.** The schema must list the runtime's engine in
  `binaryTargets` (here `["native", "debian-openssl-3.0.x"]` for bookworm).
- **Non-root.** Create/own data dirs, then `USER node`. Never run as root.
- **Signals.** Use `tini` (or `--init`) as PID 1 for clean signal handling.
- **Healthcheck.** `HEALTHCHECK` hitting the app's own endpoint (`/api/health`).
- **Metadata & interface.** `EXPOSE` the port, set OCI `LABEL`s, use **exec-form**
  `ENTRYPOINT`/`CMD` (JSON array), never shell form.
- **No secrets in any layer.** Never `COPY .env`, never bake keys/tokens. Secrets come
  from the runtime environment or the orchestrator (Komodo), not the image.

## .dockerignore checklist

- Exclude `.env` and `.env.*` (but keep `!.env.example`), `.git`, `node_modules`,
  `dist`, `.astro`, local DB files, `docs`, `.agents`, `.kiro`, and the Docker files
  themselves. A tight context is faster and keeps secrets out.

## docker-compose.yaml checklist

- **No `version:` key** (obsolete in Compose v2).
- Env via `environment:` and/or `env_file:` with **sensible defaults** (`${VAR:-default}`)
  so it runs without a `.env`.
- A **restart policy** (`unless-stopped`).
- Named **volumes** for stateful data (the SQLite DB).
- A **healthcheck** mirroring the Dockerfile's.
- Resource limits only when justified (skip for a lean hackathon service).
- **No deploy secrets.** The Komodo API key is for deploy tooling only; it must never
  appear in the compose file or the container environment.

## Komodo Stack specifics

- Komodo clones the repo and runs the compose file as a **Stack**. Keep it deployable
  as-is from the repo root.
- Provide real app config through Komodo's own environment/secret management, not the
  repo. See `docs/dev/deployment.md`.

## How to review a Dockerfile against this

1. Is the base pinned by digest and shared via `ARG`?
2. Multi-stage, with only runtime artifacts in the final stage?
3. `--frozen-lockfile` install, cache mounts, manifests-before-sources ordering?
4. Non-root `USER`, `tini`, healthcheck, `EXPOSE`, exec-form `CMD`, `LABEL`s?
5. Zero secrets in any layer; `.env` excluded by `.dockerignore`?
6. For Prisma: client generated in the shipped bundle with the right `binaryTargets`?
7. Compose: no `version:`, env defaults, restart policy, volumes, healthcheck, no deploy key?
