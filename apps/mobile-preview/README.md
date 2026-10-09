# Verma — Mobile UI Concept

A responsive, interactive mobile UI prototype for **Verma** ("A password manager you do not have to learn"), featuring Design B's geometric UI kit, illustrated onboarding carousel, and offline-first interaction flows.

## Quick Start

Requires Node.js 20 or newer. No external npm dependencies required.

```bash
# Start the preview server on port 3000
npm start
# or
node server.mjs
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- On mobile devices, the app fills the viewport with safe-area support.
- On desktop devices, the app renders inside a studio mockup frame with preview navigation.
- Deep links:
  - `/#welcome` — 3-step illustrated introduction & onboarding
  - `/#vault` — Main vault search, favorites, and entries
  - `/#ask` — Ask Your Vault natural language metadata search
  - `/#import` — Smart CSV import preview and duplicate resolution
  - `/#devices` — Authenticated device pairing simulation

## Included Flows

1. **Vault Management**: Search, entry type filtering (`login`, `note`, `api`), favorites, and creation/editing with multiline support.
2. **Explicit Secret Masking**: Passwords and note bodies remain masked (`••••`) until explicit user tap to reveal. Reopening items automatically re-masks.
3. **Deterministic Password Generator**: Cryptographically secure non-AI password generation using `crypto.getRandomValues()` with rejection sampling.
4. **Zero-Secret Assistant Search ("Ask Your Vault")**: Searches only redacted metadata (`title`, `domain`, `tags`, `type`). Secret fields never touch the search index.
5. **Smart Import Simulation**: Messy CSV data ingestion with duplicate detection (`keep` vs `skip`), editable tags, and session undo.
6. **Device Sync Simulation**: Authenticated device pairing states, pause/resume controls.
7. **Vault Lifecycle**: 24-word recovery phrase setup, demo lock/unlock state (`verma-demo`).

## Verification & QA

```bash
# Run syntax checks
npm run check

# Run vault unit tests
npm test
```

Interactive browser checks can be executed in the browser console using `qa/browser-smoke.js`.
