# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=mirror.gcr.io/library/node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392

# Base stage: minimal shared runtime with tini for proper signal handling
FROM ${NODE_IMAGE} AS base
RUN apt-get update && \
    apt-get install -y --no-install-recommends tini && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Build stage: compiles monorepo packages using pnpm Corepack
FROM base AS build
RUN corepack enable pnpm

# Layer caching: copy workspace manifests first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/web/tsconfig*.json ./apps/web/

# Install all dependencies with BuildKit store cache
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Build workspace packages
RUN pnpm run build

# Deploy isolated production runtime bundle for API
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm --filter @app/api deploy --prod /prod/api

# Relay stage: lightweight runtime for opaque envelope relay
FROM base AS relay
LABEL org.opencontainers.image.title="Verma Opaque Envelope Relay" \
      org.opencontainers.image.description="Stores authenticated opaque encrypted envelopes only"
WORKDIR /app
COPY --chown=node:node relay ./relay
RUN mkdir -p /data && chown -R node:node /data
USER node
ENV PORT=3000 \
    RELAY_DATA_DIR=/data \
    RELAY_MAX_ENVELOPE_BYTES=1048576 \
    NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "relay/server.mjs"]

# API stage: production runtime for Verma Vault API
FROM base AS api
LABEL org.opencontainers.image.title="Verma Vault API" \
      org.opencontainers.image.description="Verma offline-first encrypted vault and local API service"
WORKDIR /app
COPY --from=build --chown=node:node /prod/api ./
RUN mkdir -p /data && chown -R node:node /data
USER node
ENV PORT=3000 \
    DB_PATH=/data/vault.db \
    NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/index.js"]

# Web stage: production runtime for Verma Web SPA
FROM base AS web
LABEL org.opencontainers.image.title="Verma Web SPA" \
      org.opencontainers.image.description="Verma Single-Page Application static client"
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/dist ./dist
COPY --chown=node:node apps/web/server.mjs ./server.mjs
USER node
ENV PORT=5173 \
    NODE_ENV=production
EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:5173/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.mjs"]

# Default runtime image defaults to relay for backward compatibility
FROM relay AS runtime
