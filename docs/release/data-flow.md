# Local AI data-flow evidence

**Release evidence: E-MR-03 / AC-B-M1-01, AC-B-M1-02, AC-B-M1-03.** This is an implementation inventory as of the referenced source files, not a statement of intended architecture. “Model” below means the process reached through the configured local HTTP endpoint; no production `llama.cpp` launcher is implemented in this repository.

## Implemented Smart Import path

`POST /api/import/analyze` is the only wired application path that invokes `AiAdapter` ([`apps/api/src/routes/import.routes.ts`](../../apps/api/src/routes/import.routes.ts)). The vault must be initialized and unlocked; the route parses the submitted `csvContent`, obtains existing vault metadata for deterministic duplicate detection, and passes the parsed `headers` and `rows` to `AiAdapter.suggestImportMappings`.

| Stage | Exact data crossing the stage | Enforced behavior | Source |
| --- | --- | --- | --- |
| Browser/client → API | Entire caller-supplied `csvContent` request body | The Hono route parses it in the API process. It is retained in the module-global, in-memory `stagingStore` for up to 30 minutes or until cancellation/confirmation. | `apps/api/src/routes/import.routes.ts` |
| API → import adapter | All CSV header strings plus at most the first three parsed row objects | Before prompt construction, only values whose lower-cased header is exactly `password`, `pass`, `pwd`, or `secret` are replaced with `[REDACTED_SECRET]`. | `apps/api/src/ai/adapter.ts` |
| Adapter → local endpoint | JSON request to `${apiUrl}/api/generate`: `model`, import prompt, `stream: false`, `format: "json"`, and temperature `0.1` | The configured URL is rejected unless its parsed hostname is exactly `localhost`, `127.0.0.1`, or `::1`. The code makes an HTTP `fetch` after that check. | `apps/api/src/ai/adapter.ts` |
| Local endpoint → API | Response field `response`, expected to be a JSON string | Zod validates mappings and tags. Invalid/non-OK/timeout/error responses fall back to deterministic header mapping and no AI tags. | `apps/api/src/ai/adapter.ts` |
| API → client / vault | Proposal and staging ID; later, raw staged rows only after `POST /api/import/confirm` | Analysis does not write vault entries. Confirmation persists selected rows; cancellation removes the staging record. | `apps/api/src/routes/import.routes.ts` |

The import prompt contains the full header list and the sanitized three-row sample. It can also contain any value in a header not matching those four exact names; this is an implementation gap, not an approved disclosure claim (see findings).

## Implemented redacted-entry projection

The shared `TrustedRedactionBoundary` is a separate library abstraction. When its `invokeModel` method is used, it first rejects a locked vault, projects entries with `projectEntriesMetadata`, checks each result against the originating entry, then supplies only `{ prompt, context }` to the injected adapter. Its allowed `RedactedEntryMetadata` shape is:

| Received by injected adapter | Notes |
| --- | --- |
| `id`, `type`, `title`, `tags`, `createdAt`, `updatedAt`, `fieldLabels` | Always present in the projection. `title` and tags are metadata, not secret values. |
| `domain`, `isWeak`, `isReused`, `importSource`, `conflictMetadata` | Optional. Weak/reuse flags are deterministic checks computed before inference. |
| No property named `password`, `totpSecret`, `recoveryCodes`, `seedPhrase`, `privateKey`, `secret`, `apiKey`, `apiSecret`, `content`, `fileContent`, `masterKey`, `recoveryPhrase`, `mnemonic`, `walletAddress`, or `privateData` | The projection's denied-key list is checked, and tests also check representative secret values do not occur in serialized context. Crypto-wallet entry types are excluded. |

Sources: [`packages/shared/src/redaction/projection.ts`](../../packages/shared/src/redaction/projection.ts), [`packages/shared/src/redaction/boundary.ts`](../../packages/shared/src/redaction/boundary.ts), and [`packages/shared/src/types/metadata.ts`](../../packages/shared/src/types/metadata.ts). The boundary’s model interface is currently represented by `FakeLocalAiAdapter` in tests; it is not connected to the API `AiAdapter` or an HTTP route.

## Ask Your Vault adapter path (not routed)

`AiAdapter.askVault(query, metadata)` accepts a caller-provided natural-language query plus a prebuilt `RedactedEntryMetadata[]`. It serializes that metadata and the query into a prompt, sends it to the same local-only endpoint check described above, and only accepts `{"answer": string, "relevantEntryIds": string[]}`. Parse failure, endpoint failure, timeout, or disabled AI returns a generic fallback.

No source call site invokes `askVault`, and `createApp` mounts no Ask Your Vault endpoint. Therefore the repository has unit coverage of the adapter and library coverage of the trusted boundary, but not an end-to-end Ask Your Vault route that proves a vault entry is redacted before the runtime receives it.

## Process and capability boundary

The source-enforced boundary is an **application-level destination allowlist**: the API adapter refuses non-loopback `apiUrl` hostnames before calling `fetch`. It is not an operating-system network sandbox. Prompt text says that the model has no tools and cannot access the internet, filesystem, or secrets, but a prompt is not capability enforcement.

No launcher, sandbox profile, firewall/namespace rule, read-only mount, `llama.cpp` process definition, Unix socket/stdio transport, or runtime authentication token was found in `apps/`, `packages/`, `scripts/`, or `.github/`. Accordingly, this document does **not** claim an enforced process boundary, network denial for the model process, filesystem sandboxing, or tool denial. [`docs/runtime.md`](../runtime.md) records these as production requirements/plans, not implemented enforcement.

## Findings requiring disposition before release

1. **Critical — import sample redaction is header-name limited.** `suggestImportMappings` passes values for headers such as `notes`, `api_key`, `token`, or custom fields unchanged. It also treats only four normalized header names as secret. This conflicts with the required zero-secret-field boundary for arbitrary browser exports.
2. **High — trusted redaction is not on the production API path.** `TrustedRedactionBoundary` is not wired to `AiAdapter`, and the Ask Your Vault adapter takes metadata supplied by its caller rather than projecting raw entries itself.
3. **High — Ask Your Vault is not an API feature yet.** There is no route or call site for `askVault`, so its prompt, lock handling, and redaction cannot be demonstrated end to end.
4. **High — runtime sandbox claims are not enforced in source.** The adapter’s loopback allowlist prevents it from selecting a remote HTTP endpoint; it does not deny network or filesystem access to a local model server/process.
5. **Medium — local endpoint authenticity is not enforced.** Any service bound to an allowed loopback hostname/port can receive the prompt; there is no socket-only transport or authentication token.

## Verification performed

- `pnpm --filter @app/shared test` — passed: 55 tests, including AC-B-M1-01 redaction and lock-revocation tests.
- `pnpm --filter @app/shared build` — passed.
- `pnpm --filter @app/api test` — passed: 36 tests, including Smart Import’s external-URL rejection test.
- `pnpm --filter @app/api check` — passed.

The initial API test/check invocation failed before the shared package had been built because `@app/shared/dist/index.js` was absent; after `pnpm --filter @app/shared build`, the API test and typecheck passed.
