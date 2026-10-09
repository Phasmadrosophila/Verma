# Performance evidence

This page is the release-facing index for reproducible local-AI performance evidence. It reports only measurements captured on the named demo device; an unavailable runtime or unreviewed model artifact is reported as **Not measured**, never estimated.

## E-MR-03 / AC-E-MR-03-02

The benchmark harness is [`scripts/bench/run_local_runtime.py`](../../scripts/bench/run_local_runtime.py). It accepts only synthetic redacted fixtures, performs configurable warmup, requires at least ten measured runs, saves each runtime output, and reports median/min/max wall-clock duration when a local llama.cpp command and artifact are available.

To measure an approved artifact, run the command below on the demo device. The arguments after `--` are intentionally explicit and must be the exact local llama.cpp invocation used for every run; the harness does not download or select a model.

```powershell
python scripts/bench/run_local_runtime.py `
  --runtime-command llama-cli `
  --model C:\path\to\reviewed-model.gguf `
  --output docs/release/evidence/benchmarks/E-MR-03-WS-2-YYYY-MM-DD.json `
  --warmup-runs 2 --runs 10 --timeout-seconds 60 -- `
  -m {model} -f {prompt_file} -n 64 --temp 0.1
```

`{prompt_file}` is a temporary JSON file created from the synthetic, trusted-code redacted fixture for each harness invocation; `{model}` resolves to `--model`. The harness preserves raw runtime output and llama.cpp timing lines, and samples child-process working set every 50 ms (Windows `tasklist`; Linux `/proc/<pid>/status`).

### Current demo-device result

The record for this Orca demo machine is [E-MR-03-WS-2-2026-10-10.json](evidence/benchmarks/E-MR-03-WS-2-2026-10-10.json): **Not measured**. `llama-cli`, `llama-server`, and `ollama` were absent from `PATH`; no process was running; the repository contains no GGUF artifact; and `models/manifest.json` still marks the production model as `tbd`.

No latency, throughput, or memory number is claimed by this record. Re-run the command after a reviewed artifact and local llama.cpp runtime are available, preserving the new raw-output evidence file alongside this one.
