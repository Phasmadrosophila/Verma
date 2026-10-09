# AGENTS.md — Verma Agent Instructions

This document is the authoritative engineering guide for all AI coding agents working on **Verma**.

## 1. Single Source of Truth

The contents of the `docs/` directory are the absolute source of truth:
- `docs/prd.md` — Product Requirements Document (Architecture, Scope, Security Model, AI Behaviors).
- `docs/COMPETITION-HANDBOOK.md` — AppBuildersPH Hackathon 2026: Local AI Execution Handbook.

If any instruction, skill, or convention contradicts `docs/`, `docs/` wins.

---

## 2. Product Summary & Mission

- **Product Name:** Verma
- **Pitch Line:** A password manager you do not have to learn.
- **Mission:** An offline, local-first digital secrets manager for passwords, API keys, and account logins with an on-device Local AI Assistant and serverless direct device-to-device synchronization.
- **Core Local AI Advantage:** Secret fields remain strictly on-device; metadata is redacted in trusted code before model inference; AI runs in a no-network sandbox; core vault functions seamlessly with AI disabled.

---

## 3. Non-Negotiable Invariants & Security Boundaries

### 3.1 Zero Secret-Field Exposure to AI
- **NEVER** pass secret fields to the AI model.
- **Denied fields:** Passwords, TOTP seeds, recovery codes, seed phrases, private keys, secret values, note bodies, file contents, crypto wallet titles/metadata, vault master keys, recovery phrases.
- **Allowed metadata (only while vault is unlocked):** Entry title (non-crypto), domain/service identifier, tags, timestamps, deterministic strength/reuse flags, import source / non-secret field labels, conflict metadata.
- **Redaction is code, not a prompt instruction:** Redaction must be performed in a separate trusted application layer before invoking the LLM.

### 3.2 Sandboxed & Toolless AI Process
- The Local AI process runs locally (`llama.cpp` for demo/production; Ollama for local dev only).
- The AI process runs with **no network access** and a read-only filesystem sandbox.
- The model has **no tools** and cannot execute filesystem, vault, network, or mutation operations.
- Outputs must be strictly constrained JSON validated against schemas before presentation.

### 3.3 AI as Copilot (No Silent Mutation)
- The assistant suggests; the user confirms.
- No AI action may silently mutate records, resolve conflicts, delete entries, or apply access controls without explicit human review and confirmation.

### 3.4 Cryptography & Sync Invariants
- **Never roll custom cryptography.** Use vetted libraries (e.g., `libsodium`, `SPAKE2` for pairing, `Ed25519` for device identity).
- Device ID is the hash of the device's Ed25519 public key.
- Direct sync uses a QUIC-based, Syncthing-style authenticated transport between paired desktop devices without requiring a central server.
- Vault data and search index must be encrypted at rest (e.g., encrypted SQLite / SQLCipher).

### 3.5 Lock State Invariants
- Locking the vault immediately revokes AI access to metadata.
- No prompts, caches, crash dumps, or logs may retain unredacted entry data or secret payloads.

---

## 4. Scope & Feature Prioritization

Work strictly within the defined scope tiers from `docs/prd.md`:

### P0: Must Have (Winning Hackathon Demo Loop)
1. Encrypted local SQLite vault storage.
2. Local account lifecycle: create vault, 24-word recovery phrase, lock/unlock states.
3. Supported entry types: `login`, `note`, `api_key`.
4. Tags as the default organization mechanism.
5. Non-AI cryptographically secure password generator.
6. Sanitized messy browser CSV import with AI-suggested column mappings, tags, and duplicate groups preview.
7. Ask Your Vault natural language search over redacted metadata (passwords stay hidden until explicit unlock).
8. Sandboxed local AI inference (`llama.cpp`) with Wi-Fi disabled.
9. Direct authenticated device-to-device sync over QUIC between two paired desktop devices.
10. Offline resilience: complete flow works with network disabled.

### P1: Stretch (Only after P0 is 100% stable and verified)
- Dedicated Auto-Tagging workflow beyond import.
- Entry history with 30-day undo.
- Minimal conflict queue and plain-language conflict explanation (Resolver Lock, manual resolution).
- QR code pairing in addition to word phrase + confirmation number.
- Self-hosted Docker container providing local relay & heartbeat service.
- Dead Man's Switch test mode (encrypted emergency package, heartbeat, grace period warning, cancellation, authenticated recipient release).

### P2: Out of Scope for Hackathon (Do Not Build)
- Cloudflare managed cloud relay / billing / multi-tenant SaaS.
- Android WebView wrapper.
- Enterprise roles, ACLs, and organization recovery.
- Crypto wallet entry workflows (excluded from AI).
- Arbitrary file attachments and general import formats.

---

## 5. Technology Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | Single-page app (SPA), desktop view first |
| **Backend / API** | Hono (runs locally and in Docker container) |
| **Local Storage** | Encrypted SQLite (e.g., SQLCipher / libsodium-backed store) |
| **Direct Sync** | QUIC-based Syncthing-style protocol |
| **Cryptography** | `libsodium`, `Ed25519`, `SPAKE2` |
| **AI Runtime** | `llama.cpp` (local quantized 1B–4B model), Ollama (dev only) |
| **Containerization** | Docker multi-stage builds, non-root, pinned digests |
| **Repository** | `Phasmadrosophila/Verma` (base branch: `main`) |

---

## 6. Coding & Development Rules

1. **YAGNI & Senior Dev Discipline:** Smallest working change. No unrequested layers, extra boilerplate, or premature generalizations.
2. **Deterministic Checks:** Password strength and reuse detection are deterministic algorithms; AI is used only for plain-language explanation and prioritization.
3. **GitHub Workflow:** Follow `.agents/skills/git-github-workflow/SKILL.md`. Every feature has a GitHub Issue, dedicated branch (`lyraphasma/issue-NN-slug`), and PR against `main`. Agents NEVER merge PRs; instruct the dev to request teammate review.
4. **Docker Best Practices:** Follow `.agents/skills/docker-best-practices/SKILL.md`. Multi-stage builds, non-root user, healthchecks, zero secrets in layers.
5. **No Hallucinated Data:** Never use real user secrets or fake benchmark numbers. Demo fixtures must use sanitized, realistic mock data.

---

## 7. Team Ownership & Delivery Operations

Every implementation task must have one accountable GitHub assignee, one milestone, and one issue. Work is tracked in the Verma GitHub Project. Do not begin untracked feature work.

| GitHub username | Ownership |
| --- | --- |
| `whinee` | Backend, infrastructure, QA, and end-to-end testing |
| `Faiithal` | Frontend and backend implementation |
| `helenaherrero515` | Frontend and UI/UX |
| `HitsukiMok` | DevOps, project management, business research, and release coordination |

### Operating rules

1. Every issue must be assigned to exactly one directly accountable owner. Collaborators may be named in the issue body.
2. Every issue must belong to a milestone and use one workflow label: `status:backlog`, `status:ready`, `status:in-progress`, `status:in-review`, `status:blocked`, or `status:done`.
3. Issues with unresolved dependencies stay in `status:blocked` and must list their blocker using `blocked by #N`.
4. When a blocking issue closes, the repository automation removes `status:blocked` and applies `status:ready` when all listed blockers are closed.
5. Work moves to `status:in-progress` when the assignee starts it. A non-draft pull request moves the linked issue to `status:in-review`; merging moves it to `status:done`.
6. Only `HitsukiMok` coordinates milestone changes, scope cuts, release readiness, and project-board administration.
7. Agents must work from the assigned issue, follow the relevant `.agents/skills/` guidance, and report blockers in the issue rather than silently changing scope.

### 7.1 Canonical task format

Every implementation issue and project card must use the canonical task format below. Do not create free-form implementation issues. Use plain field labels exactly as shown; do not replace them with arbitrary heading names or reorder them.

```text
Task ID
<LANE>-<MILESTONE>-<NN>

Lane
<lane name> (lane:<label>)

Milestone
<milestone code and name> (GitHub milestone: <exact GitHub milestone>)

Size
XS | S | M | L | XL

Features
<feature IDs, or None>

Goal
<one concrete outcome>

Spec references
<docs/path.md §section>

Acceptance criteria (AC IDs)
- <AC-ID>: <testable behavior>

Done when
<observable completion statement>

Test plan (write these first — red → green → commit)
- <test or verification>

Dependencies
Blocked by [<Task ID>] <issue title> #<number>
None

Definition of done (AGENTS.md §8)
- Referenced acceptance criteria pass end to end.
- Every test-plan line exists as a test or recorded verification.
- Typecheck, lint, and tests pass.
- Affected docs are updated in the same PR.
- The change is exercised locally or in CI.
- Privacy rules are respected: no logs with entry content, no secrets, synthetic fixtures only.

Workflow
docs/development-workflow.md · Backlog: docs/workplan.md
```

Task IDs use these lanes:

- `A` Platform: storage, backend, infrastructure, and security boundary
- `B` AI: local inference, redaction, import intelligence, and evaluation
- `C` Experience: frontend and UI/UX
- `D` Sync: pairing, QUIC transport, and device synchronization
- `E` Release: QA, documentation, DevOps, and submission

Milestone codes are `M0` Foundation, `M1` AI Demo, `M2` Direct Sync, `M3` Continuity, and `MR` Release. Size is an implementation estimate, not a promise.

GitHub milestone mapping is exact:

- `M0 — Foundation` -> `P0 Foundation`
- `M1 — AI Demo` -> `P0 AI Demo`
- `M2 — Direct Sync` -> `P0 Direct Sync`
- `M3 — Continuity` -> `P1 Continuity`
- `MR — Release` -> `Release`

Use the task ID as the stable identifier. The issue title should be a concise outcome, not a second task ID.

### 7.2 Project board synchronization

- New implementation issues start in `Backlog` unless all dependencies are resolved and the issue is explicitly marked `status:ready`.
- When an owner begins work, the issue label must change to `status:in-progress`; the Project Automation workflow moves the card to `In Progress`.
- When an issue is blocked, add `status:blocked` and write every dependency as `blocked by #N`; the workflow moves the card to `Blocked`.
- When all blockers close, automation changes the issue to `status:ready` and moves the card to `Ready`.
- When the issue closes, automation changes it to `status:done` and moves the card to `Done`.
- Pull requests must reference the task issue, use the PR template, and keep the linked issue's workflow state accurate.

### Delivery cadence

- `P0 Foundation`: encrypted vault, account lifecycle, and application shell
- `P0 AI Demo`: redaction, sandboxed inference, import, and Ask Your Vault
- `P0 Direct Sync`: pairing, authenticated QUIC transport, and sync verification
- `P1 Continuity`: self-hosted Docker relay, heartbeat, and Dead Man's Switch test mode
- `Release`: integration, E2E testing, demo rehearsal, documentation, and submission

The P1 continuity milestone starts only after the P0 demo loop passes repeated offline and sync tests.

---

## 8. Required Definition of Done

Every issue is complete only when all of the following are true:

1. Referenced acceptance criteria pass end to end.
2. Each test-plan line exists as a named test or recorded verification tied to the task ID and AC ID.
3. Typecheck, lint, and relevant unit, integration, and E2E tests pass.
4. API or schema changes have matching generated types and documentation.
5. AI-affecting changes pass the redaction and local evaluation checks.
6. Affected docs are updated in the same PR.
7. The feature was exercised locally, in CI, or through a reproducible script.
8. Privacy rules are respected: no logged entry content, no secrets, and synthetic fixtures only.
9. The PR links the task issue, reports verification evidence, and has a reviewer assigned.
