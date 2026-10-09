# DOCS-SYNC.md — Documentation Inventory & Synchronization Plan

Inventory of repository files clustered by functional area, associated documentation files, mapping of what each doc describes, and assigned owner slot for verification/synchronization.

## Clusters & File Inventory

### Cluster 1: `root-platform`
**Scope:** Root build configs, workspace manifest, containerization, environment definitions, task runner.
**Files:**
- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `tsconfig.json`
- `tsconfig.base.json`
- `justfile`
- `Dockerfile`
- `.dockerignore`
- `compose.yaml`
- `.env.example`
- `.gitignore`

**Associated Docs:**
| Doc File | Claims to Describe | Owner Slot |
|---|---|---|
| `README.md` | Whole repo overview, stack, quickstart, scripts, architecture | `agent-owner-readme` |

---

### Cluster 2: `agent-rules-skills`
**Scope:** Agent instructions, governance, rules, skills, issue/PR templates, CI automation.
**Files:**
- `AGENTS.md`
- `.agents/rules/ai-security-boundary.md`
- `.agents/rules/architecture-standards.md`
- `.agents/rules/hackathon-scope.md`
- `.agents/skills/android-dev/SKILL.md`
- `.agents/skills/backend-dev/SKILL.md`
- `.agents/skills/docker-best-practices/SKILL.md`
- `.agents/skills/frontend-dev/SKILL.md`
- `.agents/skills/git-github-workflow/SKILL.md`
- `.github/ISSUE_TEMPLATE/task.md`
- `.github/pull-request-body.md`
- `.github/pull_request_template.md`
- `.github/workflows/project-automation.yml`
- `.github/workflows/pull-request-ci.yml`

**Associated Docs:**
| Doc File | Claims to Describe | Owner Slot |
|---|---|---|
| `AGENTS.md` | Core agent operating rules, non-negotiable invariants, scope, stack | `agent-owner-agents-md` |
| `.agents/rules/ai-security-boundary.md` | Redaction rules, zero-secret exposure, toolless AI sandbox | `agent-owner-ai-boundary` |
| `.agents/rules/architecture-standards.md` | Package layering, storage, crypto, sync, offline architecture | `agent-owner-arch-standards` |
| `.agents/rules/hackathon-scope.md` | P0/P1/P2 hackathon feature tiers | `agent-owner-scope-rules` |
| `.agents/skills/android-dev/SKILL.md` | Mobile React Native / Expo development guide | `agent-owner-skill-android` |
| `.agents/skills/backend-dev/SKILL.md` | Backend Hono, SQLite, AI adapter guide | `agent-owner-skill-backend` |
| `.agents/skills/docker-best-practices/SKILL.md` | Container standards, non-root, pinned digests | `agent-owner-skill-docker` |
| `.agents/skills/frontend-dev/SKILL.md` | Web React SPA guidelines, desktop-first UI | `agent-owner-skill-frontend` |
| `.agents/skills/git-github-workflow/SKILL.md` | Git branches, conventional commits, PR process | `agent-owner-skill-git` |
| `.github/pull_request_template.md` | PR checklist and reporting standards | `agent-owner-gh-pr-template` |
| `.github/ISSUE_TEMPLATE/task.md` | Task format and execution criteria | `agent-owner-gh-issue-task` |

---

### Cluster 3: `architecture-specs`
**Scope:** Core architectural requirements, product specs, competition alignment, delivery plan, workflows.
**Files:**
- `docs/prd.md`
- `docs/COMPETITION-HANDBOOK.md`
- `docs/workplan.md`
- `docs/development-workflow.md`
- `docs/disclosures.md`
- `docs/design-system.md`

**Associated Docs:**
| Doc File | Claims to Describe | Owner Slot |
|---|---|---|
| `docs/prd.md` | Product requirements, technical architecture, security, sync, AI | `agent-owner-prd` |
| `docs/COMPETITION-HANDBOOK.md` | AppBuildersPH 2026 hackathon criteria and execution rules | `agent-owner-handbook` |
| `docs/workplan.md` | Backlog, task breakdown, milestone schedules | `agent-owner-workplan` |
| `docs/development-workflow.md` | Git/GitHub board development workflow | `agent-owner-dev-workflow` |
| `docs/disclosures.md` | AI usage, third-party libraries, competition disclosures | `agent-owner-disclosures` |
| `docs/design-system.md` | Visual design system, color palette, typography, tokens | `agent-owner-design-system` |

---

### Cluster 4: `runtime-ops`
**Scope:** Runtime behavior, local execution, Docker deployment, relay, synchronization protocol, CI pipelines.
**Files:**
- `docs/runtime.md`
- `docs/self-hosted.md`
- `docs/sync.md`
- `docs/ci.md`
- `docs/local-development.md`
- `relay/server.mjs`
- `compose.yaml`
- `Dockerfile`

**Associated Docs:**
| Doc File | Claims to Describe | Owner Slot |
|---|---|---|
| `docs/runtime.md` | Runtime process models, network isolation, local AI sandbox | `agent-owner-runtime` |
| `docs/self-hosted.md` | Docker compose, self-hosted relay deployment, networking | `agent-owner-self-hosted` |
| `docs/sync.md` | Direct device-to-device QUIC sync protocol, pairing, conflict handling | `agent-owner-sync` |
| `docs/ci.md` | CI workflow steps, automated checks, verification gates | `agent-owner-ci` |
| `docs/local-development.md` | Local dev setup, pnpm commands, Ollama / llama.cpp instructions | `agent-owner-local-dev` |

---

### Cluster 5: `ai-model-evaluation`
**Scope:** On-device SLM selection, Qwen3-0.6B evaluation, manifests, evaluation benchmarks, test fixtures.
**Files:**
- `docs/model-evaluation-qwen3-0.6b.md`
- `docs/model-selection-qwen3-0.6b.md`
- `models/manifest.json`
- `models/qwen3_0_6b_candidate.json`
- `models/evaluation_fixtures.json`
- `scripts/models/evaluate_artifact.py`
- `scripts/models/verify_manifest.py`
- `scripts/ci/check-model-manifest.ps1`
- `tests/test_model_evaluation.py`
- `tests/test_verify_model_manifest.py`

**Associated Docs:**
| Doc File | Claims to Describe | Owner Slot |
|---|---|---|
| `docs/model-evaluation-qwen3-0.6b.md` | Evaluation results, accuracy, latency, memory footprint | `agent-owner-model-eval` |
| `docs/model-selection-qwen3-0.6b.md` | Model selection rationale, architecture tradeoffs, constraints | `agent-owner-model-select` |

---

### Cluster 6: `release-evidence`
**Scope:** Submission evidence, demo rehearsals, performance benchmarks, offline proof, licensing.
**Files:**
- `docs/release/data-flow.md`
- `docs/release/demo-rehearsal.md`
- `docs/release/evidence/benchmarks/E-MR-03-WS-2-2026-10-10.json`
- `docs/release/evidence/rehearsal/README.md`
- `docs/release/evidence/rehearsal/run-01.md`
- `docs/release/evidence/rehearsal/run-02.md`
- `docs/release/local-vs-online.md`
- `docs/release/model-inventory.md`
- `docs/release/model-license-review.md`
- `docs/release/offline-proof.md`
- `docs/release/performance.md`
- `scripts/bench/run_local_runtime.py`
- `scripts/release/check-model-evidence.py`
- `scripts/rehearsal/verify-rehearsal-docs.ps1`
- `src/verification/**/*`
- `tests/verification/**/*`

**Associated Docs:**
| Doc File | Claims to Describe | Owner Slot |
|---|---|---|
| `docs/release/data-flow.md` | Data flow diagrams, redaction boundaries, zero leakage proofs | `agent-owner-rel-dataflow` |
| `docs/release/demo-rehearsal.md` | Demo rehearsal script and test criteria | `agent-owner-rel-rehearsal` |
| `docs/release/evidence/rehearsal/README.md` | Rehearsal run logs index and summaries | `agent-owner-rel-rehearsal-idx` |
| `docs/release/evidence/rehearsal/run-01.md` | Rehearsal run 1 transcript and verification | `agent-owner-rel-rehearsal-r1` |
| `docs/release/evidence/rehearsal/run-02.md` | Rehearsal run 2 transcript and verification | `agent-owner-rel-rehearsal-r2` |
| `docs/release/local-vs-online.md` | Local vs online execution comparison | `agent-owner-rel-local-online` |
| `docs/release/model-inventory.md` | Model artifact inventory, hashes, licensing | `agent-owner-rel-model-inv` |
| `docs/release/model-license-review.md` | Model license legal check and compliance | `agent-owner-rel-model-lic` |
| `docs/release/offline-proof.md` | Wi-Fi disabled offline validation report | `agent-owner-rel-offline` |
| `docs/release/performance.md` | Benchmarking stats, cold-start, query latency, memory | `agent-owner-rel-perf` |

---

### Cluster 7: `packages-shared`
**Scope:** Shared TypeScript package: crypto (sodium, cipher, kdf, passgen), redaction, import CSV parsing & analysis, sync protocol & engine, types, fixtures, continuity.
**Files:**
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/continuity/*`
- `packages/shared/src/crypto/*`
- `packages/shared/src/fixtures/*`
- `packages/shared/src/import/*`
- `packages/shared/src/logging/*`
- `packages/shared/src/redaction/*`
- `packages/shared/src/sync/*`
- `packages/shared/src/types/*`
- `packages/shared/test/*`

---

### Cluster 8: `apps-api`
**Scope:** Hono backend server, SQLite/SQLCipher encrypted storage, AI adapter/Ollama client, routes (ask, entries, import, metadata, vault, fixtures).
**Files:**
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/src/index.ts`
- `apps/api/src/app.ts`
- `apps/api/src/ai/*`
- `apps/api/src/repository/*`
- `apps/api/src/routes/*`
- `apps/api/src/storage/*`
- `apps/api/test/*`

---

### Cluster 9: `apps-web`
**Scope:** React SPA desktop frontend, Vite build, UI primitives, page components, context, mock/real API client.
**Files:**
- `apps/web/package.json`
- `apps/web/vite.config.ts`
- `apps/web/index.html`
- `apps/web/src/**/*`
- `apps/web/test/**/*`

**Associated Docs:**
| Doc File | Claims to Describe | Owner Slot |
|---|---|---|
| `apps/web/README.md` | Web frontend architecture, dev setup, UI test instructions | `agent-owner-web-readme` |

---

### Cluster 10: `apps-mobile-and-preview`
**Scope:** React Native Expo mobile app (`apps/mobile`) and standalone browser testbed preview (`apps/mobile-preview`).
**Files:**
- `apps/mobile/package.json`
- `apps/mobile/app.json`
- `apps/mobile/src/**/*`
- `apps/mobile-preview/package.json`
- `apps/mobile-preview/server.mjs`
- `apps/mobile-preview/vault.js`
- `apps/mobile-preview/app.js`
- `apps/mobile-preview/tests/*`

**Associated Docs:**
| Doc File | Claims to Describe | Owner Slot |
|---|---|---|
| `apps/mobile-preview/README.md` | Mobile preview testbed instructions, test harness | `agent-owner-mobile-prev-readme` |

---

### Cluster 11: `landing-download-relay`
**Scope:** Static promotional landing page, download page, cloud relay demo page, server scripts, and QA test scripts.
**Files:**
- `index.html`
- `landing.css`
- `landing.js`
- `download.html`
- `download.css`
- `cloud.html`
- `cloud.css`
- `server.mjs`
- `relay/server.mjs`
- `qa/*`
