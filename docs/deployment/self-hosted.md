# Self-hosted opaque-envelope relay

This P1 foundation is intentionally limited to an authenticated relay for opaque, already-encrypted envelopes. It does not provide heartbeats, emergency release, user accounts, access-control lists, pairing, QUIC transport, vault functions, AI, redaction, or synchronization logic.

The relay cannot decrypt or inspect a payload. It accepts `application/octet-stream` only when the caller supplies a bearer token and envelope version `1`; it validates the envelope ID and byte limit, then stores the bytes in the named Docker volume. It intentionally has no request logger, so envelope contents, authorization values, and payload-derived data are never written to logs.

## Clean-machine smoke run

Prerequisites: Docker Engine with Docker Compose v2 and PowerShell 7+. Run the following from a fresh checkout:

```powershell
Copy-Item .env.example .env
$token = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
(Get-Content .env) -replace 'replace-with-a-random-token', $token | Set-Content .env
docker compose up --build --detach
docker compose ps
pwsh ./scripts/smoke/relay-smoke.ps1 -RelayToken $token
docker compose down
```

`docker compose ps` must report the relay as healthy before the smoke script is run. The smoke script uses a synthetic ciphertext-shaped byte sequence only; it checks `/health`, authenticated store, list, and fetch without emitting the payload or token.

## Endpoint contract

`GET /health` returns `200` with `{"status":"ok"}` and needs no token. The following endpoints require `Authorization: Bearer <RELAY_AUTH_TOKEN>`:

- `POST /v1/envelopes/{id}` requires `Content-Type: application/octet-stream`, `X-Verma-Envelope-Version: 1`, an ID matching `[A-Za-z0-9_-]{8,64}`, and a non-empty body within `RELAY_MAX_ENVELOPE_BYTES` (1 MiB by default).
- `GET /v1/envelopes/{id}` returns the exact opaque bytes.
- `GET /v1/envelopes` returns envelope IDs and byte counts, never payload content.

This is an implementation boundary, not a cryptographic assertion: clients must encrypt and authenticate envelopes before upload. The deployment never receives vault keys or plaintext secret fields.
