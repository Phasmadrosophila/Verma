# AGENTS.md — Verma Agent Instructions

This document is the authoritative engineering guide for all AI coding agents working on **Verma**.

## 1. Single Source of Truth

The contents of the `docs/` directory are the absolute source of truth:
- `docs/prd.md` — Product Requirements Document (Architecture, Scope, Security Model, AI Behaviors).
- `docs/COMPETITION-HANDBOOK.md` — AppBuildersPH Hackathon 2026: Local AI Execution Handbook.

If any instruction, skill, or convention contradicts `docs/`, `docs/` wins.

---

## 2. Product Summary & Mission

- **Product Name:** Verma
- **Pitch Line:** A password manager you do not have to learn.
- **Mission:** An offline, local-first digital secrets manager for passwords, API keys, and account logins with an on-device Local AI Assistant and serverless direct device-to-device synchronization.
- **Core Local AI Advantage:** Secret fields remain strictly on-device; metadata is redacted in trusted code before model inference; AI runs in a no-network sandbox; core vault functions seamlessly with AI disabled.

---

## 3. Non-Negotiable Invariants & Security Boundaries

### 3.1 Zero Secret-Field Exposure to AI
- **NEVER** pass secret fields to the AI model.
- **Denied fields:** Passwords, TOTP seeds, recovery codes, seed phrases, private keys, secret values, note bodies, file contents, crypto wallet titles/metadata, vault master keys, recovery phrases.
- **Allowed metadata (only while vault is unlocked):** Entry title (non-crypto), domain/service identifier, tags, timestamps, deterministic strength/reuse flags, import source / non-secret field labels, conflict metadata.
- **Redaction is code, not a prompt instruction:** Redaction must be performed in a separate trusted application layer before invoking the LLM.

### 3.2 Sandboxed & Toolless AI Process
- The Local AI process runs locally (`llama.cpp` for demo/production; Ollama for local dev only).
- The AI process runs with **no network access** and a read-only filesystem sandbox.
- The model has **no tools** and cannot execute filesystem, vault, network, or mutation operations.
- Outputs must be strictly constrained JSON validated against schemas before presentation.

### 3.3 AI as Copilot (No Silent Mutation)
- The assistant suggests; the user confirms.
- No AI action may silently mutate records, resolve conflicts, delete entries, or apply access controls without explicit human review and confirmation.

### 3.4 Cryptography & Sync Invariants
- **Never roll custom cryptography.** Use vetted libraries (e.g., `libsodium`, `SPAKE2` for pairing, `Ed25519` for device identity).
- Device ID is the hash of the device's Ed25519 public key.
- Direct sync uses a QUIC-based, Syncthing-style authenticated transport between paired desktop devices without requiring a central server.
- Vault data and search index must be encrypted at rest (e.g., encrypted SQLite / SQLCipher).

### 3.5 Lock State Invariants
- Locking the vault immediately revokes AI access to metadata.
- No prompts, caches, crash dumps, or logs may retain unredacted entry data or secret payloads.

---

## 4. Scope & Feature Prioritization

Work strictly within the defined scope tiers from `docs/prd.md`:

### P0: Must Have (Winning Hackathon Demo Loop)
1. Encrypted local SQLite vault storage.
2. Local account lifecycle: create vault, 24-word recovery phrase, lock/unlock states.
3. Supported entry types: `login`, `note`, `api_key`.
4. Tags as the default organization mechanism.
5. Non-AI cryptographically secure password generator.
6. Sanitized messy browser CSV import with AI-suggested column mappings, tags, and duplicate groups preview.
7. Ask Your Vault natural language search over redacted metadata (passwords stay hidden until explicit unlock).
8. Sandboxed local AI inference (`llama.cpp`) with Wi-Fi disabled.
9. Direct authenticated device-to-device sync over QUIC between two paired desktop devices.
10. Offline resilience: complete flow works with network disabled.

### P1: Stretch (Only after P0 is 100% stable and verified)
- Dedicated Auto-Tagging workflow beyond import.
- Entry history with 30-day undo.
- Minimal conflict queue and plain-language conflict explanation (Resolver Lock, manual resolution).
- QR code pairing in addition to word phrase + confirmation number.
- Self-hosted Docker container providing local relay & heartbeat service.
- Dead Man's Switch test mode (encrypted emergency package, heartbeat, grace period warning, cancellation, authenticated recipient release).

### P2: Out of Scope for Hackathon (Do Not Build)
- Cloudflare managed cloud relay / billing / multi-tenant SaaS.
- Android WebView wrapper.
- Enterprise roles, ACLs, and organization recovery.
- Crypto wallet entry workflows (excluded from AI).
- Arbitrary file attachments and general import formats.

---

## 5. Technology Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | Single-page app (SPA), desktop view first |
| **Backend / API** | Hono (runs locally and in Docker container) |
| **Local Storage** | Encrypted SQLite (e.g., SQLCipher / libsodium-backed store) |
| **Direct Sync** | QUIC-based Syncthing-style protocol |
| **Cryptography** | `libsodium`, `Ed25519`, `SPAKE2` |
| **AI Runtime** | `llama.cpp` (local quantized 1B–4B model), Ollama (dev only) |
| **Containerization** | Docker multi-stage builds, non-root, pinned digests |
| **Repository** | `Phasmadrosophila/Verma` (base branch: `main`) |

---

## 6. Coding & Development Rules

1. **YAGNI & Senior Dev Discipline:** Smallest working change. No unrequested layers, extra boilerplate, or premature generalizations.
2. **Deterministic Checks:** Password strength and reuse detection are deterministic algorithms; AI is used only for plain-language explanation and prioritization.
3. **GitHub Workflow:** Follow `.agents/skills/git-github-workflow/SKILL.md`. Every feature has a GitHub Issue, dedicated branch (`lyraphasma/issue-NN-slug`), and PR against `main`. Agents NEVER merge PRs; instruct the dev to request teammate review.
4. **Docker Best Practices:** Follow `.agents/skills/docker-best-practices/SKILL.md`. Multi-stage builds, non-root user, healthchecks, zero secrets in layers.
5. **No Hallucinated Data:** Never use real user secrets or fake benchmark numbers. Demo fixtures must use sanitized, realistic mock data.
