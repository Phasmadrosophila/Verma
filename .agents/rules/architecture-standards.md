# Rule: Architecture & Technical Standards

This rule governs the technology stack, cryptographic standards, and architectural patterns for **Verma**.

## 1. System Architecture

- **Frontend:** Single-page application (SPA), desktop-first layout.
- **Backend / API Service:** Hono running on Node/Bun and inside Docker containers.
- **Local Vault Storage:** Encrypted SQLite (SQLCipher / encrypted local store).
- **AI Runtime:** `llama.cpp` for local quantized models (1B–4B params). Ollama for local development only.

## 2. Cryptography & Direct Sync Standards

- **Never Roll Custom Cryptography:** Always use vetted cryptographic primitives from audited libraries (e.g. `libsodium`).
- **Device Identity:** Ed25519 keypair per device. The Device ID is the cryptographic hash of the public key.
- **Pairing Protocol:** SPAKE2 (or equivalent PAKE) using a 24-word phrase or QR code plus confirmation code.
- **Direct Transport:** QUIC-based, Syncthing-style authenticated transport for direct device-to-device synchronization over local network without central servers.
- **Encrypted at Rest:** Vault database and search index must be encrypted using the user's derived vault key.

## 3. Deterministic Code vs. AI Responsibilities

- **Password Generation:** Purely deterministic, cryptographically secure pseudo-random number generator (CSPRNG). No AI.
- **Password Strength & Reuse Detection:** Deterministic algorithms and rule-based checks. AI is only permitted to generate natural-language explanations and remediation prioritization.
- **Redaction:** Performed in a separate trusted application layer before any prompt is assembled or dispatched to the AI runtime.
