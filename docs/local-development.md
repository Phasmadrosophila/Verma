# Local Web and API Development

## Reproducible integration runtime

Install dependencies with `pnpm install`, then run:

```text
pnpm dev:integration
```

This starts the real Hono API and Vite web application on loopback only:

- Web: `http://127.0.0.1:5173`
- API health: `http://127.0.0.1:3000/health`
- API data: `.local/integration/vault.db`

The runner waits for API health before starting the web server, initializes and
unlocks a synthetic local vault with a fixed demo-only password, and seeds the
sanitized synthetic fixtures. It never prints the password or entry contents.
Press `Ctrl+C` to stop both child processes. The runner cleans up child
processes on startup failure and termination.

To reset the local fixture vault:

```text
RESET_INTEGRATION_DATA=true pnpm dev:integration
```

To start without fixture data:

```text
SEED_FIXTURES=false pnpm dev:integration
```

The Vite `/api` proxy targets the API loopback port. Override ports when needed:

```text
API_PORT=3100 WEB_PORT=5174 pnpm dev:integration
```

The runtime uses no external network service. API and web process communication
stays on `127.0.0.1`; model inference is disabled by default in development.

Run the startup smoke test with:

```text
pnpm test:integration
```

## Frontend-backend integration status

The desktop web application is now wired for the real local Hono API through the
loopback Vite `/api` proxy. Use `pnpm dev:integration` for the browser path and
the synthetic fixture database described above. The separate Expo mobile client
has a tracked integration task in issue #55 and must use a configurable LAN API
base URL rather than assuming `localhost` on a physical device.
