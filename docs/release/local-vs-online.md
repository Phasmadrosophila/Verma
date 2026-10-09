# Local vs. internet disclosure

**Release evidence: E-MR-03 / AC-B-M1-02 and AC-B-M1-03.** These statements distinguish current source behavior from documented targets. Do not describe the present implementation as “zero-knowledge AI,” “air-gapped,” or an OS-sandboxed runtime.

## What is local today

| Activity | Local fact supported by source | Internet behavior / limitation | Claim status |
| --- | --- | --- | --- |
| Vault storage and normal API routes | The Hono API starts locally and uses the configured `vault.db` path by default. Vault operations can run without AI. | This table does not assess direct sync or backups. | Implemented, outside the AI adapter. |
| Smart Import parsing, heuristics, staging, preview, confirmation | CSV parsing, deterministic mapping, duplicate detection, staging, and confirmation run in the API process. AI-disabled/failure paths use heuristic mappings. | No internet request is made when AI is disabled or the local endpoint fails. | Implemented and tested. |
| AI endpoint selection | `AiAdapter` only accepts endpoint hostnames `localhost`, `127.0.0.1`, or `::1`; external URLs are rejected before `fetch`. | The adapter will call an allowed loopback HTTP service. Loopback is local to the host, not evidence that the target process has no network access. | Implemented application-layer control. |
| Ask Your Vault inference | `POST /api/ask` obtains repository-projected metadata, passes it to the adapter, and is covered by an API test using synthetic data. | The adapter calls an allowed loopback HTTP service; this does not prove the target process has no network access or OS sandbox. | Application path implemented; runtime isolation not verified. |
| Model acquisition | No model is bundled or selected. | A human must obtain a model artifact separately if/when one is selected. The manifest remains `TBD`. | Not available as an offline-ready release capability. |

Sources: [`apps/api/src/ai/adapter.ts`](../../apps/api/src/ai/adapter.ts), [`apps/api/src/routes/import.routes.ts`](../../apps/api/src/routes/import.routes.ts), [`apps/api/src/index.ts`](../../apps/api/src/index.ts), and [`docs/runtime.md`](../runtime.md).

## What is not enforced yet

| Desired boundary | Evidence status | Release-safe wording |
| --- | --- | --- |
| Model process has no network access | No process launcher, firewall/namespace policy, or network-denial sandbox is implemented. The adapter’s remote-URL rejection is narrower. | “The app rejects configured non-loopback AI HTTP endpoints.” |
| Read-only model filesystem | No sandbox profile, read-only mount, or process invocation is present. | Do not claim a read-only filesystem sandbox. |
| Toolless runtime | The prompts instruct the model that it has no tools, but no runtime capability policy is implemented. | Do not claim enforced tool denial. |
| Production `llama.cpp` | Docs propose `llama.cpp`, but the concrete adapter defaults to HTTP on Ollama’s port (`127.0.0.1:11434`) with model `llama3.2`. | “Current development adapter targets a loopback HTTP model service.” |
| Redaction for imported samples | Only exact normalized header names `password`, `pass`, `pwd`, and `secret` have their values replaced before the import prompt. | Do not claim all CSV secret fields or note bodies are redacted. |
| Trusted redaction before Ask Your Vault | The route obtains `getMetadataList()` output, which excludes secret values and note bodies. The separately tested `TrustedRedactionBoundary` is not invoked by this route. | Do not claim the standalone trusted-redaction boundary is proven end to end for Ask Your Vault. |

## Why local AI — verified facts and bounded rationale

The verified benefit of the current adapter is limited but meaningful: it rejects a configured remote model URL, so it does not intentionally POST its constructed prompt to an internet hostname. For Smart Import, deterministic parsing and mapping still function when AI is disabled, times out, or emits invalid JSON. The shared redaction projection also demonstrates that an allowlisted metadata representation can omit the tested denied fields and crypto-wallet entries before an injected model adapter receives it.

Those facts support a local-first direction, not a blanket privacy conclusion. The strongest accurate release statement is: **“Verma’s current AI adapter only accepts loopback model endpoints and falls back to deterministic import behavior. Ask Your Vault now sends repository-projected metadata only, while the separately tested trusted-redaction library is not wired directly into that route. OS-level model sandboxing and complete CSV-field redaction remain open release gaps.”**

## Evidence checks

- `apps/api/test/ai-adapter.test.ts` verifies rejection of `https://api.openai.com` and `https://api.anthropic.com` configurations, JSON validation/fallback, and the current import masking behavior.
- `apps/api/test/smart-import-e2e.test.ts` verifies an external endpoint configuration receives HTTP 403 from `/api/import/analyze`, while AI-disabled import analysis succeeds.
- `packages/shared/test/boundary.test.ts`, `redaction.test.ts`, and `revocation.test.ts` verify metadata projection, representative secret-value exclusion, and lock-state rejection in the shared boundary.
- The commands and results are recorded in [`data-flow.md`](data-flow.md#verification-performed).
