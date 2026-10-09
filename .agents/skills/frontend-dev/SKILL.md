---
name: frontend-dev
description: >-
  Engineering guide and UI/UX standards for developing Verma's Single-Page
  Application (SPA). Covers desktop-first views, secret masking and explicit
  unlock interactions, Smart Import preview modals, Ask Your Vault search UX,
  offline/local status indicators, and resilient empty/loading/error states.
---

# Frontend Development Guide (Verma)

Authoritative guide for building the Single-Page Application (SPA) frontend for
**Verma** based on `docs/prd.md` and `docs/COMPETITION-HANDBOOK.md`.

## 1. UI Principles & Security Invariants

- **Secret Masking:** All secrets (passwords, API keys, TOTP codes) must be masked (`••••••••`) by default. Revealing or copying a secret requires explicit user click/unlock.
- **Suggestions vs. Confirmations:** AI suggestions (tags, column mappings, deduplication) must be visually distinct from persisted vault data. AI proposes; the user clicks to confirm.
- **Zero Secrets in Logs & Views:** Never display secret fields in AI debug panels, prompt previews, error toasts, or console logs.
- **Offline / Local Status:** Prominently display the local execution state (e.g. `Local AI: On-Device (No Network)`, `Direct Sync: Paired`).
- **Graceful Fallback:** When the AI model is loading, slow, or offline, the interface must allow 100% manual vault operations (create, edit, search, unlock, export).

## 2. Core UI Flows (P0 Winning Demo)

### 2.1 Vault Setup & Unlock
- **First Run:** Generate 24-word recovery phrase with clear warning and copy/print view.
- **Lock/Unlock:** Master password unlock screen with instant lock button and idle timeout.

### 2.2 Entry Management
- Supported demo types: `Login`, `Note`, `API Key`.
- Tag management: Nested tags (`Work > Google > Infra`) with intuitive chip inputs.
- Built-in deterministic password generator dialog (length, symbols, numbers, copy).

### 2.3 Smart Import Preview Modal
1. User uploads sanitized browser CSV.
2. Display AI-suggested column mappings, auto-tags, and duplicate candidate groups.
3. User edits/accepts mappings and confirms import before any records write to the vault.

### 2.4 Ask Your Vault Search UI
- Natural-language query input box (e.g., *"my work Google account for Company X"*).
- Instant metadata-only search results showing matching titles, tags, and domains.
- Passwords and secret payloads stay masked until explicit user selection and unlock.

### 2.5 Direct Sync & Pairing View
- Device list showing paired desktop nodes and connection status (QUIC direct).
- Pairing modal with 24-word phrase or confirmation number.

## 3. UI States & Component Checklist

- [ ] **Empty States:** Clear guidance for empty vaults, zero search results, or no paired devices.
- [ ] **Loading States:** Non-blocking spinners/skeletons during local model inference.
- [ ] **Model Offline Banner:** Clear notification if `llama.cpp` process is unavailable, maintaining manual vault access.
- [ ] **Accessible & Keyboard Friendly:** Quick shortcuts (`Cmd/Ctrl+K` for Ask Your Vault, `Cmd/Ctrl+L` for lock).
