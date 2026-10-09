# Local AI runtime and model inventory

## Status

No model has been selected, downloaded, bundled, or benchmarked for Verma yet. The model manifest deliberately records this as `TBD`; it must not be replaced with an invented model name, version, hash, license, benchmark, or redistribution claim.

## Runtime boundary

Production inference is planned to use `llama.cpp` with a local quantized model in the 1B--4B parameter range. Ollama is permitted for local development only; it is not the production runtime. The selected model process must have no network access, must be sandboxed with a read-only filesystem view, must expose no tools, and must receive only trusted-code redacted metadata while the vault is unlocked.

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

For the hackathon disclosure, state separately that model inference and input/output processing run locally, while model acquisition (when a human deliberately chooses to do so) requires internet access. Do not claim that a model is bundled, offline ready, or license-cleared until the manifest contains an approved selected entry.
