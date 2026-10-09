# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY relay ./relay

FROM ${NODE_IMAGE} AS runtime
LABEL org.opencontainers.image.title="Verma opaque envelope relay" \
      org.opencontainers.image.description="Stores authenticated opaque encrypted envelopes only"
WORKDIR /app
COPY --from=build --chown=node:node /app/relay ./relay
RUN mkdir /data && chown node:node /data
USER node
ENV PORT=3000 RELAY_DATA_DIR=/data RELAY_MAX_ENVELOPE_BYTES=1048576
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "relay/server.mjs"]
