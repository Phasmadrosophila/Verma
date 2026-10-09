# Verma Local Model Decision: Qwen3 0.6B

## Decision status

**Selected application model; production artifact review remains open.**

Verma uses `Qwen3 0.6B` (`qwen3:0.6b` in Ollama during development) as the application model for P0 Local AI features. The production artifact must still be a pinned, reviewed GGUF build run through `llama.cpp`. This application-model decision does not approve bundling or redistributing an artifact.

## Why this model

Verma needs a constrained local copilot, not a general-purpose chatbot. Its initial model workloads are:

- Converting natural-language vault questions into metadata search filters.
- Suggesting CSV column mappings and tags during import review.
- Explaining deterministic password-health findings.
- Returning short, schema-constrained JSON without tools or mutation access.

`qwen3:0.6b` is the configured application baseline. An earlier Ollama listing reported a 523 MB Q4_K_M artifact with 752M parameters and an Apache 2.0 license. Those reported characteristics are not independent release-artifact evidence: the exact GGUF is not present or verified, the manifest remains `tbd`, and no model benchmark has been measured in this repository. Its size is lighter than the 1B--4B model range originally described in the PRD; target-device performance still requires measured validation.

The Ollama package size is not the final mobile package size. The implementation must evaluate the exact GGUF quantization and platform build that Verma intends to ship.

## Alternatives considered

| Candidate | Reported Ollama artifact | Strength | Reason not the default |
| --- | ---: | --- | --- |
| `qwen3:0.6b` | Reported 523 MB, Q4_K_M | Selected app model; small, multilingual, structured-task baseline | Exact production artifact, provenance, license, and target-device behavior are unverified |
| `qwen2.5:0.5b` | 398 MB, Q4_K_M | Smallest practical fallback and Apache 2.0 | Older generation; lower expected instruction quality |
| `granite4:350m` | 708 MB, BF16 | Very small parameter count and instruction-following focus | Listed artifact is larger than Qwen3 0.6B and BF16 is not a mobile-oriented quantization |
| `smollm2:135m` / `360m` / `1.7b` | Compact family | Useful research fallback | Less attractive for reliable JSON extraction and import mapping without evaluation |
| `gemma3n:e2b` | 5.6 GB | Explicitly designed for phones and everyday devices | Too large for Verma's low-end storage/download target |
| `llama3.2:1b` | 1.3 GB in listed tag | Mature ecosystem | Larger artifact and non-permissive model licensing requires additional review |
| `lfm2.5-thinking:1.2b` | 731 MB | Designed for on-device use | Thinking behavior adds latency and complexity Verma does not need for bounded tasks |

## Runtime profile

| Profile | Model | Runtime | Intended device |
| --- | --- | --- | --- |
| Mobile default | Qwen3 0.6B, reviewed Q4 GGUF | `llama.cpp` | Low-end and mid-range phones, older laptops |
| Desktop optional | Qwen3 1.7B, only after evaluation | `llama.cpp` | Devices with more memory and storage |
| No-AI fallback | Deterministic search and import rules | Application code | Every device when AI is unavailable or disabled |

Development may use `ollama run qwen3:0.6b`; Ollama is not the production runtime.

Recommended starting inference settings are a 2K--4K context window, low temperature around `0.1`, and a 128--256 token output limit. These are starting points, not benchmark claims. The adapter must use the model's supported structured-output mechanism and validate every response against a schema.

## Security and privacy boundary

The model receives only trusted-code redacted metadata while the vault is unlocked. It must never receive passwords, TOTP seeds, recovery codes, seed phrases, private keys, secret values, note bodies, file contents, vault keys, or crypto-wallet metadata.

The model process must:

- Have no network access.
- Run in a read-only sandbox.
- Expose no tools or filesystem operations.
- Perform no vault mutations.
- Be unloaded or have access revoked when the vault locks.
- Remain optional; core vault workflows must work with AI disabled.

Search, password strength, password reuse, and duplicate detection remain deterministic application behavior. The model only interprets, explains, or prioritizes redacted results. Suggestions require explicit user confirmation.

## Selection gate

This recommendation becomes an official selected model only after all of the following are complete:

1. Choose an exact upstream GGUF artifact and version.
2. Record its SHA-256 in `models/manifest.json`.
3. Complete license and redistribution review against Verma's final license direction.
4. Test redaction and schema validation with synthetic fixtures.
5. Measure cold start, resident memory, latency, battery/thermal behavior where available, and output quality on agreed target devices.
6. Verify offline operation with network access disabled.
7. Document the measured results without inventing or generalizing benchmarks.

Until then, the manifest remains `tbd` by design.

## Sources

- [Ollama Qwen3 0.6B](https://ollama.com/library/qwen3:0.6b)
- [Ollama model library](https://ollama.com/library)
- [`docs/prd.md`](prd.md)
- [`docs/runtime.md`](runtime.md)
- [`docs/COMPETITION-HANDBOOK.md`](COMPETITION-HANDBOOK.md)
