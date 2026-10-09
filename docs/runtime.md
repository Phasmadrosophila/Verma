# Local AI runtime and model inventory

## Status

No model has been approved for release, downloaded, bundled, or benchmarked for Verma yet. The current recommendation is documented in [`model-selection-qwen3-0.6b.md`](model-selection-qwen3-0.6b.md), but the model manifest deliberately remains `TBD` until an exact artifact, hash, license review, and measured evaluation are complete.

## Runtime boundary

Production inference is planned to use `llama.cpp` with a local quantized model. The proposed default is Qwen3 0.6B in a reviewed GGUF quantization; it is not selected. Ollama is permitted for local development only; it is not the production runtime. No production launcher, OS-level network denial, read-only filesystem sandbox, or enforced toolless process policy is present in this repository. These remain release requirements rather than implemented claims.

The vault remains usable when inference is disabled, unavailable, malformed, or times out. The runtime is never given passwords, secret values, note bodies, recovery material, private keys, file contents, vault keys, or any crypto-wallet metadata.

## Model manifest

[`models/manifest.json`](../models/manifest.json) is the reviewable inventory for every model that Verma may use. It has one entry per model and the verifier enforces the following schema:

| Field | Requirement |
| --- | --- |
| `schema_version` | Exactly `1.0` |
| `id` | Unique lowercase kebab-case identifier |
| `role` | `text-generation` or `embedding` |
| `status` | `tbd` or `selected` |
| Model details | Literal `TBD` while status is `tbd`; real non-empty values once selected |
| `sha256` after selection | Lowercase, 64-character SHA-256 digest of the exact artifact |
| `artifact_path` after selection | Relative path below the verified model directory; traversal is rejected |
| `runtime` | Production `llama.cpp`; development `Ollama` |

Model details are `model_name`, `version`, `sha256`, `license`, `source_url`, `artifact_path`, and `redistribution_review`. A selected entry must point to its upstream source, identify the exact version and artifact, state its license, and record a human redistribution review. The manifest is an inventory and verifier input, not permission to download, redistribute, or bundle a model.

## Verification

The verifier uses only Python's standard library and never downloads a model or contacts a network service.

```powershell
# Validate the schema and the intentionally unresolved inventory.
python scripts/models/verify_manifest.py --manifest-only

# After model selection, verify each downloaded artifact against the pinned hash.
python scripts/models/verify_manifest.py --model-root path/to/downloaded-models

# Run the AC-A-M0-04-02 tests, including a synthetic hash-mismatch case.
python tests/test_verify_model_manifest.py
```

Artifact verification fails if the selection remains `TBD`, a model file is absent, or a digest differs. Hashes prove file integrity only; they do not replace model license, provenance, security, quality, or redistribution review.

## Selection and disclosure gate

Before changing an entry from `tbd` to `selected`, record the model's upstream source, exact version, artifact SHA-256, license, and redistribution conclusion. Run a measured evaluation on the demo hardware and document the device, inputs, number of runs, measurement method, latency, and quality result. Do not publish claims until they are measured, and verify license compatibility with Verma's final fair-code/source-available license direction.

The current selection rationale and alternatives are recorded in [`model-selection-qwen3-0.6b.md`](model-selection-qwen3-0.6b.md). That document is a proposal, not a replacement for this selection gate.

For the hackathon disclosure, state separately that model inference and input/output processing run locally, while model acquisition (when a human deliberately chooses to do so) requires internet access. Do not claim that a model is bundled, offline ready, or license-cleared until the manifest contains an approved selected entry.

## AI Adapter Integration

The `AiAdapter` provides an application-layer interface for a configured local model endpoint. It enforces:
- **Loopback endpoint restriction**: Rejecting non-local `apiUrl` destinations before the application makes its HTTP request. This does not prove OS-level network isolation.
- **Graceful Fallback**: Providing sensible defaults (e.g., empty suggestions or generic search results) if the model is disabled, times out, or fails to respond.
- **Constrained Output**: Validating the LLM response against a rigorous JSON schema before any other system component processes it, preventing malformed outputs from breaking the core vault.

## Smart Import Integration

Smart Import combines deterministic heuristic parsing with on-device local AI mapping suggestions:
- **Redacted import samples**: The current import path replaces values under exact normalized headers `password`, `pass`, `pwd`, and `secret` with `[REDACTED_SECRET]`; do not generalize this to every possible secret or note column.
- **Local endpoint only**: The adapter rejects configured cloud AI URLs through `localhost` / `127.0.0.1` / `::1` enforcement, but this is not a complete process-level network boundary.
- **Preview vs. Commit Invariant**: Import proposals and mappings exist purely in staging memory. Zero entries are written to encrypted vault storage until explicit user confirmation (AC-B-M1-03-02, AC-B-M1-03-05).
- **Heuristic Fallback**: If the local AI process is offline or returns malformed data, deterministic heuristics immediately map standard browser columns with no user interruption.
