# Verma Disclosures

This page records the current repository, asset, dependency, service, model, and development-tool disclosures for the AppBuildersPH submission. It describes what is present or documented in this checkout; it does not grant a license or make a security audit conclusion.

## Existing code and history

Verma is developed in the public `Phasmadrosophila/Verma` repository. The repository history contains the current Hono API, React/Vite desktop web application, shared TypeScript package, Expo/mobile work, mobile-preview prototype, relay prototype, verification scripts, synthetic fixtures, and release documentation. Earlier commits and merged pull requests remain visible in Git history.

The repository includes implementation and design work from multiple contributors. The Git history and GitHub pull requests are the authoritative contribution record; this page does not attempt to replace that record with a generated authorship list.

## Assets and design sources

Tracked visual assets include Verma logo files, onboarding illustrations, geometric artwork, screenshots, UI icons, and the `assets/mochiy-pop-one.woff2` font file. The repository also contains references to Figma design source frames in `docs/design-system.md`; editable Figma source files are not bundled in this repository.

Asset provenance, font licensing, and any third-party artwork attribution should be confirmed by the team before final submission. No claim that every asset is cleared for redistribution is made here.

## Dependencies and frameworks

The dependency graph is recorded in `package.json` files and pinned by `pnpm-lock.yaml`. The main application uses Node.js, pnpm workspaces, TypeScript, Hono, `@hono/node-server`, `better-sqlite3`, Zod, React, React DOM, React Router, Vite, Tailwind CSS, Lucide React, Expo/React Native for the mobile work, and TypeScript test tooling. The relay uses the Docker/Compose runtime described in `docs/self-hosted.md`.

This page is not a substitute for package-level license notices. A dependency license inventory and final legal review remain release tasks.

## Cloud services and network behavior

The desktop application does not intentionally call a cloud AI service. The current AI adapter accepts only `localhost`, `127.0.0.1`, or `::1` endpoint hostnames and rejects configured external AI URLs. The local integration runner starts the web and API processes on loopback and uses a local SQLite database.

The repository contains external URLs as documentation, source references, synthetic fixture values, and package/tool links. Model acquisition is not implemented and would require a human-managed transfer if a model were selected. The self-hosted relay is a P1 prototype for opaque encrypted envelopes; it is not a cloud Verma service.

The loopback restriction is an application-layer control. The repository does not provide evidence for an OS-level network-denial sandbox, read-only model filesystem, or audited air gap.

## Models and AI frameworks

- `models/manifest.json` is the authoritative inventory and remains `status: "tbd"` with model identity, artifact, hash, license, source, and redistribution fields set to `TBD`.
- Qwen3 0.6B is a proposed candidate direction only. Its candidate metadata file must not be treated as proof that an exact artifact is present, selected, measured, or cleared for redistribution.
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

The desktop web application is the primary hackathon release path. Expo/mobile integration is tracked separately, and relay, heartbeat, and Dead Man's Switch functionality is P1 prototype/test mode. These areas should not be presented as completed P0 release capabilities.
