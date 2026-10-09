# Verma

An offline AI, local-first password manager with a desktop app for more hands-off management of secrets and passwords.

## Navigation

- [What Verma is](#what-verma-is)
- [Current release state](#current-release-state)
- [Run the desktop integration](#run-the-desktop-integration)
- [What is included](#what-is-included)
- [Local versus internet behavior](#local-versus-internet-behavior)
- [AI model status](#ai-model-status)
- [Known limitations](#known-limitations)
- [Documentation and disclosures](#documentation-and-disclosures)
- [Development checks](#development-checks)

## What Verma is

Verma is an offline AI, local-first password manager with a desktop app for people who want less manual work managing logins, notes, API keys, and password health. The goal is not to hand control of secrets to an assistant. It is to make routine organization, search, import, and health review more hands-off while keeping confirmation and secret access with the user.

The desktop app combines an Hono API, a local SQLite vault, explicit secret masking, deterministic password generation, Smart Import, Ask Your Vault metadata search, and direct device-sync workflows. AI assistance is designed around trusted-code redaction and local execution; the vault remains usable when AI is disabled or unavailable.

The primary hackathon release path is the desktop web application. The repository also contains mobile and mobile-preview work; mobile backend integration is tracked separately in issue [#55](https://github.com/Phasmadrosophila/Verma/issues/55) and is not the primary hackathon acceptance path.

## Current release state

This repository is in feature freeze. The remaining work is documentation, verification, and release-blocking fixes only.

- The real desktop web-to-Hono integration is available through the local integration runner.
- The local AI model is not selected, bundled, or release-approved. `models/manifest.json` intentionally remains `tbd`.
- Qwen3 0.6B is a proposed candidate, not a shipped model or measured benchmark result.
- The self-hosted relay, heartbeat, and Dead Man's Switch are P1 prototype/test-mode work, not part of the P0 core vault release.
- No cloud AI service is used by the application path. The current adapter accepts loopback model endpoints only.

## Run the desktop integration

Prerequisites: Node.js 22 or newer and pnpm 10 or newer. From a fresh clone, run `pnpm install`, then:

```powershell
pnpm dev:integration
```

This command is documented and implemented, but has not been re-run from a clean clone during this documentation pass. Treat clean-clone setup as **unverified** until `pnpm test:integration` and a browser check pass on the target machine.

The runner starts:

- Web application: `http://127.0.0.1:5173`
- API health check: `http://127.0.0.1:3000/health`
- Synthetic integration database: `.local/integration/vault.db`

The runner seeds sanitized fixtures, never prints the demo password or entry contents, and keeps web/API communication on loopback. Press `Ctrl+C` to stop it.

For the standalone landing/download preview, use `pnpm preview:landing` and open `http://localhost:3000`. This is a separate preview server from the desktop integration runner.

## What is included

- Vault lifecycle with initialization, lock/unlock, and recovery-phrase flows.
- Login, note, and API-key entries with explicit masking and reveal behavior.
- Cryptographically secure non-AI password generation using browser randomness.
- Smart Import for messy CSV data, deterministic mappings, duplicate preview, tags, staging, and explicit confirmation.
- Ask Your Vault over repository-projected metadata rather than secret values.
- Direct device pairing and sync workflows in the desktop application.
- A local AI adapter with schema validation and deterministic fallbacks when AI is disabled, unavailable, malformed, or timed out.
- P1 prototype/test-mode continuity components: self-hosted opaque-envelope relay, heartbeat concepts, and Dead Man's Switch test mode.

## Local versus internet behavior

Normal vault, import, and API operations run in the local Hono process. The current AI adapter rejects configured non-loopback endpoints before making a request, and development defaults to AI disabled. This is an application-layer loopback restriction, not proof of an OS-level network sandbox, read-only filesystem sandbox, or toolless model process.

No model artifact is bundled. If a model is selected later, a human will need to acquire it separately, which requires internet access or another transfer method. The current code does not implement model acquisition or a production `llama.cpp` launcher.

The exact current boundary and its open gaps are documented in [`docs/release/local-vs-online.md`](docs/release/local-vs-online.md) and [`docs/release/data-flow.md`](docs/release/data-flow.md). Do not interpret the application as zero-knowledge, air-gapped, or audited.

## AI model status

Qwen3 0.6B is the documented candidate direction for a small local assistant, but it is not selected. The authoritative manifest keeps the model name, version, digest, license, source, artifact path, and redistribution review as `TBD` until an exact artifact is obtained and independently reviewed.

Model/runtime documentation:

- [`docs/runtime.md`](docs/runtime.md) — runtime boundary, manifest gate, and verification procedure.
- [`docs/model-selection-qwen3-0.6b.md`](docs/model-selection-qwen3-0.6b.md) — candidate rationale and alternatives.
- [`docs/model-evaluation-qwen3-0.6b.md`](docs/model-evaluation-qwen3-0.6b.md) — evaluation evidence status; currently not measured.
- [`docs/release/model-inventory.md`](docs/release/model-inventory.md) — release-facing artifact gate.
- [`models/manifest.json`](models/manifest.json) — authoritative machine-readable inventory.

## Known limitations

- The exact production model artifact, version, SHA-256, license review, and redistribution decision are open.
- No measured model latency, memory, throughput, accuracy, or quality result is available. Do not use the historical candidate numbers as release benchmarks.
- The repository contains no production `llama.cpp` launcher and no verified OS-level model network/filesystem sandbox.
- CSV redaction currently covers exact normalized headers `password`, `pass`, `pwd`, and `secret`; do not generalize this to every possible secret column.
- P1 relay, heartbeat, and Dead Man's Switch behavior is prototype/test mode and is not a replacement for the P0 vault or direct-sync acceptance criteria.

## Documentation and disclosures

- [`docs/disclosures.md`](docs/disclosures.md) — code/history, assets, dependencies, cloud boundary, model/framework status, and AI development-tool disclosure.
- [`docs/local-development.md`](docs/local-development.md) — local web/API integration details.
- [`docs/COMPETITION-HANDBOOK.md`](docs/COMPETITION-HANDBOOK.md) — competition requirements and evidence rules.
- [`docs/prd.md`](docs/prd.md) — product requirements and scope.

Verma's code license direction is **fair-code/source-available**. The specific final license and its commercial-use terms remain pending legal and release review, so no final license file or compatibility conclusion has been selected yet.

## Development checks

Install dependencies with `pnpm install`, then use the relevant checks:

```powershell
pnpm verify
pnpm check
pnpm test
pnpm test:integration
pnpm check:landing
```

These commands are repository-defined. Full clean-machine execution and release-device rehearsal remain verification tasks for the submission checklist.
