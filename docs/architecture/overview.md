# Architecture Overview

Verma is architected as an offline, local-first application designed for maximum privacy and zero secret-field leakage. 

## High-Level System Architecture

```mermaid
flowchart TD
    subgraph Frontend [Single-Page Application (SPA)]
        UI[React UI]
        VC[Vault Context]
        API_Client[API Client]
    end

    subgraph Backend [Local API Service]
        Hono[Hono Framework]
        Router[API Routes]
        Repo[Vault Repository]
        Storage[Encrypted SQLite]
    end
    
    subgraph AI [Local AI Runtime]
        SandboxedAI[llama.cpp / Ollama]
    end

    UI --> VC
    VC --> API_Client
    API_Client -- HTTP / JSON --> Hono
    Hono --> Router
    Router --> Repo
    Repo --> Storage
    
    Router -- "Redacted Metadata Only" --> SandboxedAI
```

## System Components

1. **Frontend (SPA)**
   - Built with React, Vite, and Tailwind CSS.
   - Desktop-first UI focusing on explicit lock/unlock states.
   - Strict masking of secret fields in UI; zero secrets in URL state or local storage.

2. **Backend / API Service**
   - Built on [Hono](https://hono.dev/).
   - Exposes RESTful endpoints for frontend consumption.
   - Contains the core **Vault Repository**, handling business logic, encryption, and metadata projection.

3. **Database & Storage**
   - Encrypted local SQLite (using `better-sqlite3` and `libsodium`).
   - Handles encryption-at-rest. The master key is held in memory only while the vault is unlocked.

4. **Local AI Runtime**
   - Operates in a network-isolated sandbox.
   - Model inference is performed using `llama.cpp` (or Ollama during dev).
   - Only receives sanitized metadata (titles, domains, tags), never secret fields like passwords or API keys.

## Data Flow & Invariants

- **Zero Secret Exposure**: The `VaultRepository` explicitly maps raw entries to `RedactedEntryMetadata` before invoking any AI capabilities.
- **Toolless AI**: The AI model has no tools. It operates purely via prompt inference and returns structured JSON (validated by schemas).
- **Synchronous Locking**: When the vault is locked, the encryption key is dropped from memory, preventing access to the data layer.

## Additional Reading

- [Design System](./design-system.md)
- [Runtime Environment](./runtime.md)
- [Sync Protocol](./sync.md)
