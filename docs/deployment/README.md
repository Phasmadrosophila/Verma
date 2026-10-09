# Deployment and Operations

Verma is designed as a local-first application, but it supports self-hosting for relay capabilities or exposing the web UI.

## Local and Self-Hosted Architecture

- [Continuous Integration (CI)](./ci.md): Details on the GitHub Actions pipeline.
- [Self-Hosted Setup](./self-hosted.md): Instructions for running Verma via Docker or Docker Compose.

## Docker Setup

Verma includes a multi-stage `Dockerfile` and a `compose.yaml` file for easy containerization. The container runs a secure, non-root environment using lightweight base images.

To build and run locally:
```bash
docker compose up --build
```
This starts the local Hono API service (and optionally the web frontend statically served or proxied).

## Environment Variables

For deployment, you may configure:
- `PORT`: The port the server listens on (default: `3000`).
- `DATA_DIR`: Path to store the `vault.db` file (default: `./data`).
- `AI_RUNTIME_PATH`: Path to the local `llama.cpp` binary.
- `AI_MODEL_PATH`: Path to the local GGUF model file.

*Note: The `DATA_DIR` must be a persistent volume in Docker to ensure vault data is not lost.*
