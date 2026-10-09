---
name: backend-dev
description: >-
  Engineering guide and checklist for developing Verma's backend and API
  services. Covers Hono framework, encrypted SQLite storage, trusted-layer
  metadata redaction, sandboxed llama.cpp integration, QUIC direct sync,
  SPAKE2 pairing, deterministic security checks, and Docker relay services.
---

# Backend Development Guide (Verma)

Authoritative guide for developing backend services, storage engines, AI pipelines,
and sync protocols for **Verma** based on `docs/prd.md`.

## 1. Architecture & Core Stack

- **Framework:** Hono (TypeScript) — portable across Node.js runtime, Docker containers, and Cloudflare Workers.
- **Local Database:** Encrypted SQLite (e.g., SQLCipher or libsodium-authenticated storage).
- **AI Runtime:** `llama.cpp` locally (via Unix socket or stdio in production; Ollama for dev only).
- **Device Sync:** QUIC-based Syncthing-style authenticated peer-to-peer transport.
- **Cryptography:** `libsodium` for symmetric/asymmetric encryption, `Ed25519` for device identities, `SPAKE2` for device pairing.

## 2. Local AI Pipeline & Redaction Engine

### Invariant: Redaction in Trusted Code
Redaction must happen in a dedicated application layer **before** any data is sent to the LLM. Redaction is deterministic code, not a prompt instruction.

```typescript
// Example redaction projection
export interface RedactedEntryMetadata {
  id: string;
  title: string;          // Non-crypto only; crypto entries excluded entirely
  domain?: string;        // e.g. "github.com"
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isReused: boolean;      // Deterministic check
  isWeak: boolean;        // Deterministic check
  fieldLabels: string[];  // e.g. ["username", "email"] - NO VALUES
}
```

### Denied Data Fields
Never pass into the AI process:
- Passwords or API key values
- TOTP secrets or 2FA tokens
- 24-word recovery phrases or vault master keys
- Note bodies or file contents
- Crypto wallet titles, addresses, or metadata

### Model Process Sandboxing
- Run `llama.cpp` with network access disabled (`--no-net` or OS sandbox).
- Enforce strict JSON output schemas on all model responses.
- AI failure, timeout, or invalid JSON must gracefully degrade to manual vault operations.

## 3. Cryptography & Direct Device Sync

- **Device Identity:** Generate an Ed25519 keypair per device. The Device ID is the SHA-256 hash of the public key.
- **Pairing:** Use SPAKE2 with a 24-word phrase or QR code + confirmation number. Never hand-roll cryptographic primitives.
- **Direct Sync:** Direct device-to-device transport using QUIC. Synced changes are end-to-end encrypted payloads; relay servers only store encrypted blobs.
- **Lock State:** Locking the vault immediately purges derived decryption keys and metadata caches from memory.

## 4. Deterministic Checks (Non-AI)

- **Password Generation:** Cryptographically secure PRNG (`crypto.getRandomValues`).
- **Strength & Reuse:** Deterministic entropy / pattern checks. AI only formats explanations and prioritizes fixes.

## 5. Development Checklist

1. [ ] Redaction layer tested with zero secret leakage.
2. [ ] Crypto wallet entries completely filtered out from AI context.
3. [ ] Model invocations use strict JSON schema validation.
4. [ ] AI process operates without network connectivity.
5. [ ] Direct QUIC sync verified between two local instances.
6. [ ] Core vault operations work when AI process is terminated.
