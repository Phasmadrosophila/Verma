# Features

Verma is an offline, local-first digital secrets manager featuring an integrated on-device AI.

## Core Vault Features

1. **Vault Lifecycle**
   - **Initialization**: Create a vault secured by a master password.
   - **Lock/Unlock**: Data is decrypted into memory only upon explicit unlock. Locking the vault immediately revokes memory and AI access to metadata.
   - **Storage**: Entries are encrypted at rest using `libsodium`.

2. **Entry Management**
   - Supported entry types: `login`, `note`, and `api_key`.
   - **Tagging**: Organization mechanism using tags.
   - **Secret Masking**: Secret fields (passwords, TOTP seeds, etc.) are strictly kept off-limits from AI and masked from logs and unexpected UI renders.

## Local AI Capabilities

Verma uses a sandboxed local AI process (e.g., `llama.cpp` or Ollama) with strict privacy boundaries:

- **Ask Your Vault**: Natural language search over redacted metadata (passwords stay hidden).
- **Smart Import**: AI-assisted mapping and deduplication preview for messy CSV browser exports.

*Note: The AI operates purely as a copilot. It suggests changes but cannot silently mutate records or execute filesystem/network commands.*

## Synchronization

- **Direct Device-to-Device Sync**: A QUIC-based authenticated transport for syncing vaults directly between two paired desktop devices without a central server.
