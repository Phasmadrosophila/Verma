# Verma Disclosures

This page records the current repository, asset, dependency, service, model, and development-tool disclosures for the AppBuildersPH submission. Verma is framed as an offline AI, local-first password manager with a desktop app: the product goal is more hands-off management of secrets and passwords without giving an assistant silent mutation or unrestricted secret access. This page describes what is present or documented in this checkout; it does not grant a license or make a security audit conclusion.

## Existing code and history

Verma is developed in the public `Phasmadrosophila/Verma` repository. The repository history contains the current Hono API, Electron desktop application, shared TypeScript package, mobile-preview prototype, relay prototype, verification scripts, synthetic fixtures, and release documentation. Earlier commits and merged pull requests remain visible in Git history.

The repository includes implementation and design work from multiple contributors. The Git history and GitHub pull requests are the authoritative contribution record; this page does not attempt to replace that record with a generated authorship list.

## Assets and design sources

Tracked visual assets include Verma logo files, onboarding illustrations, geometric artwork, screenshots, UI icons, and the `assets/mochiy-pop-one.woff2` font file. The repository also contains references to Figma design source frames in `docs/design-system.md`; editable Figma source files are not bundled in this repository.

Asset provenance, font licensing, and any third-party artwork attribution should be confirmed by the team before final submission. No claim that every asset is cleared for redistribution is made here.

## Dependencies and frameworks

The dependency graph is recorded in `package.json` files and pinned by `pnpm-lock.yaml`. The main application uses Node.js, pnpm workspaces, TypeScript, Hono, `@hono/node-server`, `better-sqlite3`, Zod, React, React DOM, React Router, Vite, Electron, react-native-web, Tailwind CSS, Lucide React, and TypeScript test tooling. The relay uses the Docker/Compose runtime described in `docs/self-hosted.md`.

This page is not a substitute for package-level license notices. A dependency license inventory and final legal review remain release tasks.

## Cloud services and network behavior

The desktop application does not intentionally call a cloud AI service. The current AI adapter accepts only `localhost`, `127.0.0.1`, or `::1` endpoint hostnames and rejects configured external AI URLs. The local integration runner starts the web and API processes on loopback and uses a local SQLite database.

The repository contains external URLs as documentation, source references, synthetic fixture values, and package/tool links. Model acquisition is not implemented and would require a human-managed transfer if a model were selected. The self-hosted relay is a P1 prototype for opaque encrypted envelopes; it is not a cloud Verma service.

The loopback restriction is an application-layer control. The repository does not provide evidence for an OS-level network-denial sandbox, read-only model filesystem, or audited air gap.

## Why local AI benefits Verma

Verma targets the repetitive work around secrets and passwords: organizing entries, searching metadata, reviewing imports, and understanding deterministic password-health findings. Local AI can make that work more hands-off without requiring vault metadata or user questions to be sent to a cloud AI provider. It also keeps the core assistant path usable during network outages and avoids making a cloud AI account a prerequisite.

The privacy benefit is bounded by the implementation evidence. Trusted application code redacts denied fields before the AI adapter receives data, and user confirmation is required before suggestions become mutations. The current loopback restriction is not an audited air gap or OS-level process sandbox. Qwen3 0.6B is the application model, while the exact production GGUF artifact remains unpinned.

## Processing breakdown

On-device today: local vault operations, SQLite storage, secret masking, password generation, CSV parsing, deterministic import fallback behavior, metadata projection, direct-sync cryptographic verification, and the desktop web/API loopback path. AI-enabled application requests use Qwen3 0.6B and are restricted to allowed loopback endpoints; the app degrades to deterministic behavior when Ollama or the model is unavailable.

Internet or external transfer: installing uncached dependencies, obtaining a future model artifact, GitHub/CI/review workflows, deployment and hosted assets, optional P1 relay access, and some physical-device mobile development setups. No cloud AI service is required by the core desktop path.

## Models and AI frameworks

- `models/manifest.json` is the authoritative inventory and remains `status: "tbd"` with model identity, artifact, hash, license, source, and redistribution fields set to `TBD`.
- Qwen3 0.6B is the configured application model through the Ollama tag `qwen3:0.6b`. Its metadata file must not be treated as proof that an exact production artifact is present, measured, or cleared for redistribution.
- The planned production runtime is `llama.cpp`; Ollama is documented for development only. The current repository does not contain a production `llama.cpp` launcher or a bundled model artifact.
- Current application integration reaches a configured loopback HTTP model service and validates structured responses. AI-disabled and failure paths retain deterministic behavior where implemented.
- No model benchmark is reported as measured in this submission. The device, exact artifact, inputs, run count, and measurement method required by the competition handbook are not all available.

See [`runtime.md`](runtime.md), [`model-selection-qwen3-0.6b.md`](model-selection-qwen3-0.6b.md), [`model-evaluation-qwen3-0.6b.md`](model-evaluation-qwen3-0.6b.md), and [`release/local-vs-online.md`](release/local-vs-online.md).

## AI development tools

The documented AI-assisted development tools used for this work are:

- Orca with OmniRouter.
- Codex, routed through OmniRouter.
- Kiro CLI.
- Antigravity.
- Claude Code.
- OpenCode.

Before final submission, the human team should confirm whether any additional AI development tools or model providers were used. No additional tools are added to this disclosure without that confirmation.

## Scope disclosure

The Electron desktop application is the primary hackathon release path. Relay, heartbeat, and Dead Man's Switch functionality is P1 prototype/test mode. These areas should not be presented as completed P0 release capabilities.
