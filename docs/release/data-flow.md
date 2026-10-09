# Local AI data-flow evidence

**Release evidence: E-MR-03 / AC-B-M1-01, AC-B-M1-02, AC-B-M1-03.** This is an implementation inventory as of the referenced source files, not a statement of intended architecture. “Model” below means the process reached through the configured local HTTP endpoint; no production `llama.cpp` launcher is implemented in this repository.

## Implemented Smart Import path

`POST /api/import/analyze` is one of two wired application paths that invoke `AiAdapter` ([`apps/api/src/routes/import.routes.ts`](../../apps/api/src/routes/import.routes.ts)); the other is `POST /api/ask`, which calls `AiAdapter.askVault` (see the Ask Your Vault path below). For Smart Import, the vault must be initialized and unlocked; the route parses the submitted `csvContent`, obtains existing vault metadata for deterministic duplicate detection, and passes the parsed `headers` and `rows` to `AiAdapter.suggestImportMappings`.

| Stage | Exact data crossing the stage | Enforced behavior | Source |
| --- | --- | --- | --- |
| Browser/client → API | Entire caller-supplied `csvContent` request body | The Hono route parses it in the API process. It is retained in the module-global, in-memory `stagingStore` for up to 30 minutes or until cancellation/confirmation. | `apps/api/src/routes/import.routes.ts` |
| API → import adapter | All CSV header strings plus at most the first three parsed row objects | Before prompt construction, each row value is checked by its normalized header (lower-cased, with spaces/underscores/hyphens stripped). A value whose header contains any of 12 secret substrings (`password`, `pass`, `pwd`, `secret`, `totp`, `token`, `key`, `seed`, `phrase`, `pin`, `code`, `private`) is replaced with `[REDACTED_SECRET]`; a value whose header contains any of 6 note substrings (`note`, `desc`, `comment`, `memo`, `content`, `body`) is replaced with `[REDACTED_NOTE]`. | `apps/api/src/ai/adapter.ts` |
| Adapter → local endpoint | JSON request to `${apiUrl}/api/generate`: `model`, import prompt, `stream: false`, `format: "json"`, and temperature `0.1` | The configured URL is rejected unless its parsed hostname is exactly `localhost`, `127.0.0.1`, or `::1`. The code makes an HTTP `fetch` after that check. | `apps/api/src/ai/adapter.ts` |
| Local endpoint → API | Response field `response`, expected to be a JSON string | Zod validates mappings and tags. Invalid/non-OK/timeout/error responses fall back to deterministic header mapping and no AI tags. | `apps/api/src/ai/adapter.ts` |
| API → client / vault | Proposal and staging ID; later, raw staged rows only after `POST /api/import/confirm` | Analysis does not write vault entries. Confirmation persists selected rows; cancellation removes the staging record. | `apps/api/src/routes/import.routes.ts` |

The import prompt contains the full header list and the sanitized three-row sample. Redaction is driven by substring matches against the normalized header name, so a secret-bearing header whose name contains none of those 18 substrings is passed through unchanged; this is an implementation gap, not an approved disclosure claim (see findings).

## Implemented redacted-entry projection

The shared `TrustedRedactionBoundary` is a separate library abstraction. When its `invokeModel` method is used, it first rejects a locked vault, projects entries with `projectEntriesMetadata`, checks each result against the originating entry, then supplies only `{ prompt, context }` to the injected adapter. Its allowed `RedactedEntryMetadata` shape is:

| Received by injected adapter | Notes |
| --- | --- |
| `id`, `type`, `title`, `tags`, `createdAt`, `updatedAt`, `fieldLabels` | Always present in the projection. `title` and tags are metadata, not secret values. |
| `domain`, `isWeak`, `isReused`, `importSource`, `conflictMetadata` | Optional. Weak/reuse flags are deterministic checks computed before inference. |
| No property named `password`, `totpSecret`, `recoveryCodes`, `seedPhrase`, `privateKey`, `secret`, `apiKey`, `apiSecret`, `content`, `fileContent`, `masterKey`, `recoveryPhrase`, `mnemonic`, `walletAddress`, or `privateData` | The projection's denied-key list is checked, and tests also check representative secret values do not occur in serialized context. Crypto-wallet entry types are excluded. |

Sources: [`packages/shared/src/redaction/projection.ts`](../../packages/shared/src/redaction/projection.ts), [`packages/shared/src/redaction/boundary.ts`](../../packages/shared/src/redaction/boundary.ts), and [`packages/shared/src/types/metadata.ts`](../../packages/shared/src/types/metadata.ts). The boundary’s model interface is currently represented by `FakeLocalAiAdapter` in tests; it is not connected directly to the API `AiAdapter`.

## Ask Your Vault path

`AiAdapter.askVault(query, metadata)` accepts a caller-provided natural-language query plus a prebuilt `RedactedEntryMetadata[]`. It serializes that metadata and the query into a prompt, sends it to the same local-only endpoint check described above, and only accepts `{"answer": string, "relevantEntryIds": string[]}`. Parse failure, endpoint failure, timeout, or disabled AI returns a generic fallback.

`POST /api/ask` is mounted by `createApp` and calls `repo.getMetadataList()` before invoking `AiAdapter.askVault`. The route is covered by `apps/api/test/api-routes.test.ts` using synthetic data. The repository projection excludes secret values and note bodies before the adapter call, but this route does not independently invoke `TrustedRedactionBoundary` and does not prove that an OS-level model sandbox is active.

## Process and capability boundary

The source-enforced boundary is an **application-level destination allowlist**: the API adapter refuses non-loopback `apiUrl` hostnames before calling `fetch`. It is not an operating-system network sandbox. Prompt text says that the model has no tools and cannot access the internet, filesystem, or secrets, but a prompt is not capability enforcement.

No launcher, sandbox profile, firewall/namespace rule, read-only mount, `llama.cpp` process definition, Unix socket/stdio transport, or runtime authentication token was found in `apps/`, `packages/`, `scripts/`, or `.github/`. Accordingly, this document does **not** claim an enforced process boundary, network denial for the model process, filesystem sandboxing, or tool denial. [`docs/runtime.md`](../runtime.md) records these as production requirements/plans, not implemented enforcement.

## Findings requiring disposition before release

1. **Critical — import sample redaction is header-name limited.** `suggestImportMappings` redacts only values whose normalized header contains one of 12 secret or 6 note substrings; a secret-bearing header matching none of them (for example an opaque custom field name) is passed through unchanged. This substring allowlist conflicts with the required zero-secret-field boundary for arbitrary browser exports.
2. **High — the separately tested trusted redaction boundary is not on the Ask Your Vault production API path.** The route uses the repository's `getMetadataList()` projection, which excludes secret fields, but `TrustedRedactionBoundary` is not invoked by the route and the adapter accepts metadata supplied by its caller.
3. **Medium — Ask Your Vault is now routed, but runtime isolation remains unverified.** The route has lock-state handling and API coverage, but its local endpoint is only constrained at the application layer; no OS-level network/filesystem/tool sandbox or authenticated local runtime is implemented here.
4. **High — runtime sandbox claims are not enforced in source.** The adapter’s loopback allowlist prevents it from selecting a remote HTTP endpoint; it does not deny network or filesystem access to a local model server/process.
5. **Medium — local endpoint authenticity is not enforced.** Any service bound to an allowed loopback hostname/port can receive the prompt; there is no socket-only transport or authentication token.

## Verification performed

- `pnpm --filter @app/shared test` — passed: 59 tests, including AC-B-M1-01 redaction and lock-revocation tests.
- `pnpm --filter @app/shared build` — passed.
- `pnpm --filter @app/api test` — passed: 42 tests, including Smart Import’s external-URL rejection test.
- `pnpm --filter @app/api check` — passed.

The initial API test/check invocation failed before the shared package had been built because `@app/shared/dist/index.js` was absent; after `pnpm --filter @app/shared build`, the API test and typecheck passed.
