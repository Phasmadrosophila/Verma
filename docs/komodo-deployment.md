# Verma Komodo Infrastructure & Deployment Guide

This document defines the containerized deployment architecture, Komodo orchestration integration, and operational procedures for hosting **Verma** (API, Relay, and Web SPA) on Komodo Core at `https://komodo-ckn-omv-main.lyra-on.top`.

---

## 1. Cloudflare vs Docker / Komodo Parity Matrix

Verma supports dual deployment models: serverless edge hosting via Cloudflare Workers and KV, and self-hosted container orchestration via Docker Compose on Komodo Core. Both implementations uphold Verma's zero-knowledge security boundary.

| Capability / Layer | Cloudflare Edge Stack | Docker / Komodo Stack | Parity Notes |
| :--- | :--- | :--- | :--- |
| **Web Client Hosting** | Cloudflare Workers Static Assets (CDN edge distribution) | `web` container (Node static server, port 5173) | Identical React SPA bundle; SPA client-side routing fallback supported. |
| **API Runtime** | Cloudflare Worker relay endpoints | `api` container (Hono Node server, port 3000) | Identical relay routing, request logging redaction, and schema validation. |
| **Relay Storage** | Cloudflare KV (`VERMA_RELAY_KV`) | `relay` container (`relay-data` named volume) | Both enforce opaque byte storage, `[A-Za-z0-9_-]{8,64}` ID schema, and size caps. |
| **Primary Vault Store** | Client-side local encrypted SQLite | Container persistent volume (`api-data:/data/vault.db`) | Master key and secret data never touch server memory in unencrypted form. |
| **Process Model** | Serverless ephemeral execution | Long-running containers with `tini` PID 1 | Docker uses explicit signal handlers and `restart: unless-stopped`. |
| **Health Probes** | Cloudflare Health Checks / Synthetics | Docker `HEALTHCHECK` probing `GET /health` | Both return HTTP 200 with standard service JSON payloads. |
| **Execution Security** | V8 isolate sandboxing | Non-root `node` user + `no-new-privileges:true` | Zero root execution; least-privilege containment. |
| **Offline Capability** | Requires edge connectivity | Fully operational on local LAN / air-gapped host | Local Docker stack operates with Wi-Fi/WAN disconnected. |
| **Secret Management** | Cloudflare Encrypted Environment Secrets | Komodo Stack Environment Secrets / `.env` | Zero secrets baked into container image layers. |

---

## 2. Target Environment & Komodo Host

- **Komodo Base URL:** `https://komodo-ckn-omv-main.lyra-on.top`
- **Orchestration Engine:** Komodo Core (Docker Compose v2 integration)
- **Target Host Operating System:** OpenMediaVault (OMV) / Debian Linux
- **Stack Services:**
  - `api`: Verma Vault API (Port 3000)
  - `relay`: Verma Opaque Envelope Relay (Port 8080 host -> 3000 container)
  - `web`: Verma Single-Page Application (Port 5173)

---

## 3. Komodo API Credentials & Least-Privilege Setup

To automate deployments or synchronize stacks via Komodo API or CI/CD pipelines, configure the following environment variables:

```bash
KOMODO_BASE_URL="https://komodo-ckn-omv-main.lyra-on.top"
KOMODO_API_KEY="replace-with-komodo-api-key"
KOMODO_API_SECRET="replace-with-komodo-api-secret"
KOMODO_STACK_NAME="verma-stack"
```

### 3.1 Minimum Required Permissions & Scopes

When creating API keys in the Komodo Core UI:

1. Navigate to **Settings** -> **API Keys** -> **New API Key**.
2. Assign the key a descriptive identifier (e.g., `verma-deploy-pipeline`).
3. Set permissions strictly to the required resources:
   - **Stacks:** `Read`, `Write`, `Deploy` (limited to `verma-stack` resource).
   - **Builds / Repos:** `Read`, `Write` (for triggering image builds).
   - **System / Server Admin:** `Deny` (never grant global server administration).
4. Save the generated `KOMODO_API_KEY` and `KOMODO_API_SECRET` in your secure environment or CI vault.

---

## 4. Stack Deployment Procedures

### 4.1 Method A: Komodo Web UI (Git-Connected Stack)

1. Open `https://komodo-ckn-omv-main.lyra-on.top` and authenticate.
2. Navigate to **Stacks** -> **Create Stack**.
3. Set **Stack Name** to `verma-stack`.
4. Choose **Git Repository**:
   - **Repository URL:** `https://github.com/Phasmadrosophila/Verma.git`
   - **Branch:** `main` (or active release branch)
   - **Compose File Path:** `docker-compose.yaml`
5. Under **Environment Variables**, define the production runtime values:
   ```text
   RELAY_AUTH_TOKEN=<generated-cryptographic-bearer-token>
   RELAY_PORT=8080
   RELAY_MAX_ENVELOPE_BYTES=1048576
   API_PORT=3000
   WEB_PORT=5173
   NODE_ENV=production
   ```
6. Click **Deploy Stack**. Komodo will clone the repository, execute the multi-stage BuildKit build, create named volumes, and start the services.

### 4.2 Method B: Komodo REST API Deployment

Deployments can be triggered programmatically via Komodo's REST API:

```bash
# Authenticate and trigger stack build & deploy
curl -fsSL -X POST "https://komodo-ckn-omv-main.lyra-on.top/api/v1/stack/deploy" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${KOMODO_API_KEY}" \
  -H "X-API-Secret: ${KOMODO_API_SECRET}" \
  -d '{
    "stack": "verma-stack",
    "git_ref": "main",
    "build_images": true,
    "prune": false
  }'
```

---

## 5. Reverse Proxy, TLS, and DNS Configuration

When serving `https://komodo-ckn-omv-main.lyra-on.top` and routing traffic to Verma services:

### 5.1 Recommended Reverse Proxy Setup (Traefik / Nginx / Caddy)

Example Nginx host routing block:

```nginx
# Web SPA Client
server {
    server_name verma.lyra-on.top;
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/certs/verma.crt;
    ssl_certificate_key /etc/ssl/private/verma.key;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy API requests to backend service
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Opaque Relay Endpoint
server {
    server_name relay.verma.lyra-on.top;
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/certs/verma.crt;
    ssl_certificate_key /etc/ssl/private/verma.key;

    client_max_body_size 2M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5.2 Troubleshooting Connectivity & TLS

1. **502 Bad Gateway:**
   - Verify container health status: `docker compose ps` (containers must report `healthy`).
   - Check container internal logs: `docker compose logs -f api` or `docker compose logs -f web`.
   - Ensure the reverse proxy host is connected to the same Docker bridge network or targets `127.0.0.1:<PORT>`.
2. **TLS Certificate Errors on `komodo-ckn-omv-main.lyra-on.top`:**
   - Ensure ACME challenge / Let's Encrypt DNS-01 or HTTP-01 challenge has propagated.
   - Verify DNS records point to the WAN IP of the host gateway.
3. **Envelope Upload 413 Payload Too Large:**
   - Check reverse proxy `client_max_body_size` (must be >= `RELAY_MAX_ENVELOPE_BYTES`, default 1 MiB).
4. **CORS / Missing Headers:**
   - Ensure `Authorization`, `Content-Type`, and `X-Verma-Envelope-Version` headers are forwarded without modification by intermediate proxies.

---

## 6. Security Audit & Invariants

All container deliverables must strictly satisfy the following security controls:

1. **Non-Root Execution:**
   - All runtime stages run under `USER node` (UID/GID 1000).
   - Docker Compose enforces `security_opt: ["no-new-privileges:true"]`.
2. **Zero Secrets in Layers:**
   - Images never include `.env` or credential files (`.dockerignore` enforces exclusion).
   - All sensitive tokens (`RELAY_AUTH_TOKEN`, `KOMODO_API_SECRET`) are injected strictly at runtime via environment variables.
3. **Data Volume Isolation & Permissions:**
   - Named volumes `api-data` and `relay-data` mount to `/data`.
   - Directories are initialized with `0700` permissions and owned by `node:node`.
4. **Signal Handling & Process Lifecycle:**
   - `tini` binary acts as PID 1 entrypoint for all containers, preventing orphaned zombie processes and ensuring graceful termination on `SIGTERM` / `SIGINT`.
5. **Zero Payload Logging:**
   - Relay and API servers log metadata only (method, path, status, duration). Secret fields, ciphertext payloads, and authorization tokens are strictly omitted from log streams.
