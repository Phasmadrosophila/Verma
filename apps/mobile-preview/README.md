# Verma — Mobile UI Concept

A responsive, interactive mobile UI prototype for **Verma** ("A password manager you do not have to learn"), featuring Design B's geometric UI kit, illustrated onboarding carousel, and offline-first interaction flows.

## Quick Start

Requires Node.js 22+ and pnpm 12.8.1. From the repository root:

```sh
pnpm preview:mobile
# Optional custom port:
pnpm preview:mobile --port 6128
```

To connect the preview to the encrypted local API, run `pnpm dev` in another
terminal and open the landing server at `http://localhost:5127/app#vault`.
The preview proxies `/api/*` to `127.0.0.1:3000`; no remote backend is used.

Open http://localhost:5128/?demo=1#vault for the reproducible six-entry design.
Use `?demo=1#welcome` for onboarding. Demo mode never reads or writes persisted
browser data. Without demo=1, the existing browser state remains available.
This is a UI prototype; use synthetic data only.

Fonts are bundled in the repository, so internet access is not required for
rendering. At desktop widths the UI is a centered phone frame; on small screens
it fills the viewport. See [preview reproducibility](../../docs/preview-reproducibility.md)
for both apps, browser-size guidance, commands, and verification limitations.

Deep links: `#welcome`, `#vault`, `#ask`, `#import`, `#devices`.

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
