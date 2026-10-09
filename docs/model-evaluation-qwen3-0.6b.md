# Verma Model Evaluation Evidence: Qwen3 0.6B

## 1. Application Model and Artifact Provenance

**Application model: Qwen3 0.6B. Model benchmark: not measured. Production artifact: not pinned.** The metadata below is a production-artifact proposal record, not verified release evidence. The authoritative `models/manifest.json` remains `tbd` and keeps all artifact identity, hash, license, source, and redistribution fields as `TBD`.

| Property | Value |
| --- | --- |
| **Model Name** | `Qwen/Qwen3-0.6B-Instruct-GGUF` |
| **Version** | `v0.6.0-instruct` |
| **Quantization** | `Q4_K_M` |
| **Parameters** | 752M |
| **License** | Reported by candidate metadata as `Apache-2.0`; exact artifact and redistribution review are not verified. |
| **Source URL** | `https://huggingface.co/Qwen/Qwen3-0.6B-Instruct-GGUF/resolve/main/qwen3-0_6b-instruct-q4_k_m.gguf` |
| **Artifact Path** | `qwen3-0_6b-instruct-q4_k_m.gguf` |
| **File Size** | ~523 MB (548,405,248 bytes) |
| **SHA-256** | Candidate metadata value only; not independently verified against an artifact in this repository. |
| **Runtime Target** | Production: `llama.cpp` · Development: `Ollama` |

---

## 2. Evaluation Workloads & Synthetic Fixtures

Application-level tests exercise synthetic redacted metadata fixtures (`models/evaluation_fixtures.json` and `packages/shared/src/redaction/evaluation-fixtures.ts`) across four P0 local AI capability areas with **strict zero secret field exposure**. This is redaction and schema-path evidence, not a benchmark of the Qwen3 model, because no model artifact was run:

1. **Ask Your Vault (Natural Language Search):**
   - Natural language queries over redacted title, domain, tags, and timestamps.
   - Verified that passwords, notes, and private keys are never included in prompts or responses.
2. **Smart Import (Column Mapping):**
   - Messy CSV header classification (`login_id` -> `username`, `pass` -> `password`, `extra_notes` -> `notes`).
   - Strict schema-constrained JSON outputs.
3. **Tag Suggestions:**
   - Heuristic metadata tag suggestions based on service domain and title.
4. **Password Health Explanations:**
   - Human-readable explanations for deterministic reuse and weak password checks.

---

## 3. Hardware Benchmarks & Performance Profile

No qualifying benchmark is available. The earlier candidate table contained unsupported performance claims and must not be used as release evidence. A valid future result must name the device, exact model artifact, inputs, number of runs, warmups, timing/memory method, and output-quality criteria.

| Metric | Current evidence |
| --- | --- |
| Device | Not measured |
| Exact artifact | Not available/verified |
| Inputs and runs | Not measured |
| Latency, memory, throughput | Not measured |
| Output quality/schema rate | Not measured as a model benchmark |

---

## 4. Offline Resilience & Failure Modes

1. **Loopback restriction:** The application rejects configured external AI endpoints. This does not verify zero network connectivity for a model process.
2. **Model Timeout / Unavailable Fallback:** When the local model process is uninitialized, killed, or exceeds the timeout threshold (e.g. 10s), the system gracefully returns deterministic fallback search/mapping results without crashing or leaking state.
3. **Malformed JSON Handling:** Responses failing schema validation trigger immediate safe fallbacks.

---

## 5. Acceptance Criteria Traceability

- Candidate metadata exists in `models/qwen3_0_6b_candidate.json`, but it does not select or approve an artifact.
- Synthetic fixtures and redaction tests exist, but they do not constitute a measured model-quality benchmark.
- Device evaluation metrics: **not measured**.
- Application fallback and endpoint-rejection tests exist; OS-level offline runtime isolation: **not verified**.
- Manifest verifier and selection gates are implemented; the manifest remains intentionally unresolved.
