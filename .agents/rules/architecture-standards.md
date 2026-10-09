# Rule: Architecture & Technical Standards

This rule governs the technology stack, cryptographic standards, and architectural patterns for **Verma**.

## 1. System Architecture

- **Frontend:** Single-page application (SPA), desktop-first layout.
- **Backend / API Service:** Hono running locally on Node; Docker hosts the relay node.
- **Local Vault Storage:** SQLite via better-sqlite3 with application-layer AES-256-GCM payload encryption (not SQLCipher).
- **AI Runtime:** Ollama HTTP adapter on `127.0.0.1:11434` for the app (default llama3.2); the `llama.cpp` harness in `scripts/bench` is used only for benchmarks.

## 2. Cryptography & Direct Sync Standards

- **Never Roll Custom Cryptography:** Always use vetted cryptographic primitives; currently Node's `node:crypto` (aes-256-gcm, ed25519, scrypt).
- **Device Identity:** Ed25519 keypair per device. The Device ID is the SHA-256 hash of the public key.
- **Pairing Protocol:** Authenticated pairing using Ed25519 signatures + HMAC and a 6-digit confirmation code (SPAKE2 was the intended/target PAKE).
- **Direct Transport:** Authenticated peer transport engine for direct device-to-device synchronization without central servers. QUIC is the target; the current implementation is in-memory.
- **Encrypted at Rest:** Vault database and search index must be encrypted using the user's derived vault key.

## 3. Deterministic Code vs. AI Responsibilities

- **Password Generation:** Purely deterministic, cryptographically secure pseudo-random number generator (CSPRNG). No AI.
- **Password Strength & Reuse Detection:** Deterministic algorithms and rule-based checks. AI is only permitted to generate natural-language explanations and remediation prioritization.
- **Redaction:** Performed in a separate trusted application layer before any prompt is assembled or dispatched to the AI runtime.
