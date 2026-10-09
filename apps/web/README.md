# @app/web — Verma Web SPA

The desktop-first single-page app for **Verma** ("A password manager you do not have to learn"). React 19 + TypeScript + Vite, with React Router for navigation, Tailwind CSS v4 for styling, and a thin `fetch`-based client against the local Hono backend.

## Architecture

The app is a protected SPA. `VaultProvider` (`src/VaultContext.tsx`) holds lock state; `ProtectedRoute` in `src/App.tsx` redirects to `/lock` whenever the vault is uninitialized or locked. All unlocked pages render inside `Layout` (`src/components/Layout.tsx`).

### Routes (`src/App.tsx`)

| Path | Page | Notes |
| --- | --- | --- |
| `/lock` | `LockScreen` | Public. Create vault or unlock. |
| `/` | `EntryList` | Protected. All items. |
| `/entry/new` | `EntryForm` | Protected. Create entry. |
| `/entry/:id` | `EntryDetail` | Protected. View entry; secrets hidden until explicit reveal. |
| `/entry/:id/edit` | `EntryForm` | Protected. Edit entry. |
| `/ask` | `AskVault` | Protected. Natural-language search over redacted metadata. |
| `/import` | `SmartImport` | Protected. CSV import with AI-suggested mappings/tags/duplicates. |
| `/settings` | `Settings` | Protected. Includes device sync surface. |

There is no `/devices` route; device pairing/sync is surfaced inside `Settings`.

### Pages (`src/pages/`)

`LockScreen`, `EntryList`, `EntryForm`, `EntryDetail`, `AskVault`, `SmartImport`, `Settings`.

### API client (`src/api.ts`)

A single `api` object wrapping the local backend endpoints:

| Method | Endpoint |
| --- | --- |
| `getVaultStatus` | `GET /api/vault/status` |
| `initVault` | `POST /api/vault/init` |
| `unlockVault` | `POST /api/vault/unlock` |
| `lockVault` | `POST /api/vault/lock` |
| `searchMetadata` | `GET /api/metadata/search?q=` |
| `askVault` | `POST /api/ask` |
| `getEntry` | `GET /api/entries/:id` |
| `createEntry` | `POST /api/entries` |
| `updateEntry` | `PUT /api/entries/:id` |
| `deleteEntry` | `DELETE /api/entries/:id` |
| `analyzeImport` | `POST /api/import/analyze` |
| `cancelImport` | `POST /api/import/cancel` |
| `confirmImport` | `POST /api/import/confirm` |

Shared request/response types come from the `@app/shared` workspace package.

### Design tokens (`src/tokens.ts`)

Typed color, spacing, radius, typography, breakpoint, elevation, and motion tokens transcribed from the Figma system and `docs/design-system.md`. The same families are also declared as CSS custom properties in `src/index.css` (`--font-display`, `--font-sans`, etc.).

Font families (`Fredoka` display, `Parkinsans` body, `IBM Plex Mono`) are referenced by name only. No Google Fonts link or `@font-face` is loaded; the app relies on locally installed fonts and falls back through `"Google Sans", system-ui, sans-serif` / `ui-monospace, monospace`. TODO(verify): wire in a hosted or bundled web-font source before relying on exact brand rendering.

## Dev scripts (`package.json`)

```bash
pnpm dev      # vite dev server
pnpm check    # tsc -b typecheck
pnpm test     # node --test with tsx over test/**/*.test.tsx
pnpm build    # tsc -b && vite build
pnpm lint     # oxlint
pnpm preview  # vite preview of the production build
```

## Tests (`test/`)

Node test runner (`node --test`) via `tsx`:

- `api-integration.test.tsx`
- `frontend-hardening.test.tsx`
- `shell-primitives.test.tsx`
- `unlocked-workspace.test.tsx`
- `ux-review-states.test.tsx`
- `vault-lifecycle.test.tsx`
