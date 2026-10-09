# Security Architecture

Verma's primary security objective is the absolute protection of secret fields.

## Core Security Invariants

### 1. Zero Secret-Field Exposure to AI
- The Local AI **never** receives passwords, TOTP seeds, recovery codes, private keys, note bodies, or file contents.
- Metadata (titles, tags, non-secret fields) is explicitly mapped through a redaction layer (`toRedactedMetadata`) before being passed to any AI prompt.
- Redaction is enforced in trusted application code, not via LLM instructions.

### 2. Encryption at Rest
- The SQLite database does not store plaintext entry data.
- The `ciphertext` column contains the `libsodium` authenticated encrypted JSON payload.
- Key derivation uses memory-hard algorithms (e.g., Argon2 or similar via `libsodium`).

### 3. Lock State
- The master decryption key lives in memory **only** while the vault is explicitly unlocked.
- Calling `/api/vault/lock` immediately purges the key from memory.
- Subsequent database reads fail to decrypt until unlocked again.

### 4. Sandboxed AI Execution
- The AI runs via `llama.cpp` locally.
- It is launched within a read-only filesystem sandbox with **Wi-Fi/network access disabled**.
- The AI has **no tools**; it cannot make HTTP requests, run commands, or mutate the database.

## Validation & Mitigation

- **Safe Logging**: The application uses a `SafeLogger` wrapper that redacts request payloads. Entry contents are strictly prohibited from log output.
- **Frontend Masking**: The React frontend forces `type="password"` for secrets and never includes them in the URL hash, router state, or local storage.
- **Privacy Scanner**: A dedicated test suite (`test:privacy`) runs to assert that test cases do not leak fixtures into logs or error boundaries.

## Authentication and Direct Sync

- Verma uses **SPAKE2** for secure pairing between devices.
- Direct device-to-device sync is established over an authenticated QUIC transport layer using device Ed25519 public keys.
