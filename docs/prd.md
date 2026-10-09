# Product Requirements Document: Digital Secrets Manager

**Status:** Hackathon MVP
**Product name:** Verma
**Pitch line:** A password manager you do not have to learn.
**License direction:** Fair-code, source-available. Candidate: Functional Source License. Final licensing and model-license compatibility require review.
**Primary audience:** AppBuildersPH Hackathon 2026 judges and the implementation team

## 1. Product Summary

Verma is a local-first, offline digital secrets manager for passwords, API keys, and account logins. Its headline feature is a Local AI Assistant that organizes and finds a vault using a redacted metadata view without sending vault data off the device. A secondary differentiator is direct device-to-device synchronization using a QUIC-based, Syncthing-style protocol, with no central server in the local mode.

The product removes the setup and organization burden normally placed on password-manager users. Users can import a messy browser export, ask natural-language questions, and accept tag suggestions. They can then sync the encrypted vault directly between paired devices while the AI remains local on each device.

The core vault must remain useful when the AI is disabled. The AI suggests; the user confirms. No AI action may lock a user out, change a secret silently, or apply an access-control change without review.

## 2. Problem

People store passwords, API keys, and account logins across browser autofill, sticky notes, spreadsheets, and memory. Existing password managers improve storage but still require users to understand tagging, folders, imports, and security hygiene.

This creates three problems:

- Users cannot reliably find the right secret when they need it.
- Imports become a second cleanup project instead of a migration path.
- Security warnings are easy to ignore because users do not know what to fix first.

Technical users also face a tradeoff between trusting a third-party cloud and operating a brittle self-hosted system. Organizations need role-based access, auditability, and controlled recovery without giving the provider access to secret payloads.

## 3. Goals

### Hackathon goals

1. Demonstrate a working vault with one complete core flow: import, organize, search, and explicitly unlock a selected entry.
2. Demonstrate the Local AI Assistant with Wi-Fi disabled.
3. Make the local advantage concrete: secret fields remain on-device, metadata is redacted before inference, and the AI process has no network access.
4. Demonstrate direct encrypted sync between two paired devices without a server.
5. Show two polished AI workflows: Smart Import and Ask Your Vault. Auto-Tagging may support these workflows but is not a separate demo pillar.
6. Provide honest measurements for AI quality, latency, and sync completion on the demo hardware.
7. Ship a public repository with reproducible setup instructions and complete disclosures.

### Product goals beyond the hackathon

- Support local, self-hosted, and managed-cloud deployment from one codebase.
- Provide safe multi-device sync, version history, and conflict resolution.
- Support a Dead Man's Switch and emergency recovery workflow.
- Provide an enterprise-ready permission and audit model.
- Build trust through transparent code, fair-code licensing, and security review.

## 4. Non-Goals

The hackathon MVP will not attempt to:

- Build a complete enterprise identity and access-management suite.
- Claim a completed security audit.
- Claim zero-knowledge AI. The assistant sees selected redacted metadata while the vault is unlocked.
- Train or fine-tune a model on user vault data.
- Let the model directly execute tools, mutate entries, delete conflicts, or apply ACLs.
- Make weak-password or password-reuse detection an AI feature. Those checks are deterministic code; AI only explains and prioritizes them.
- Support every import format, secret type, or file size at launch.
- Make the Dead Man's Switch work without an always-on peer, self-hosted server, or managed-cloud server. A test-mode switch with an always-on local Docker node is in scope as a P1 extension.
- Present unverified competitor weaknesses as facts.

The hackathon MVP also will not attempt to:

- Build a production managed-cloud service with billing, multi-tenant operations, or an SLA.
- Build Android or a production web-only sync implementation.
- Implement enterprise roles, ACLs, audit Q&A, or policy drafting.
- Support crypto wallet workflows in the demo.
- Implement a fully autonomous estate-settlement system. The MVP switch only releases a preselected encrypted emergency package after a clearly defined grace period.
- Implement general-purpose conflict resolution beyond a clear prototype state.

## 5. Target Users and Deployment Modes

| User | Pain | Value | Initial mode |
| --- | --- | --- | --- |
| Non-technical users | Secrets are scattered and security tools feel like homework | One-click import, plain-language search, assistant-led organization, and direct device sync | Local, multi-device sync with no account or server |
| Technical users and homelabbers | They want control without a third-party AI processor | Transparent source, local AI, direct encrypted sync, and no central service | Local prototype; self-hosting later |

### Hackathon deployment modes

- Secrets live on the user's devices.
- Devices sync directly over the local network.
- No provider account or central server is required.
- One local account can use multiple paired devices.

#### Self-hosted deployment

- A single Docker deployment provides the always-on relay/heartbeat service needed for self-hosted sync and the Dead Man's Switch.
- The operator owns the machine, network, backups, and security configuration.
- The container stores only encrypted vault payloads and encrypted emergency packages.
- The self-hosted demo has one Admin role and one User role at most; enterprise authorization is not part of the MVP.

#### Managed cloud direction

- The managed tier remains a product direction using a blind end-to-end encrypted relay on Cloudflare Workers, D1, and R2.
- It is not required to operate the hackathon demo.
- Superadmin infrastructure access must never expose user payloads or emergency-package plaintext.

## 6. Product Principles

1. **Local-first:** The default experience works without an internet connection.
2. **AI as a copilot:** The assistant proposes; a user confirms.
3. **Core vault independence:** Turning AI off leaves a functional vault.
4. **Least privilege:** The AI receives only the minimum redacted data needed for a task.
5. **No silent mutation:** No generated result changes a secret, conflict, or ACL automatically.
6. **Honest boundaries:** Clearly distinguish local processing, cloud processing, deterministic checks, and unverified assumptions.
7. **Recovery is explicit:** Recovery phrases and emergency flows are shown with clear warnings and no hidden backup.

## 7. Winning Hackathon Scope

### The one-sentence product

> An offline AI vault organizer that turns a messy password export into a useful encrypted vault, then syncs it directly between your devices without sending secrets or AI metadata to a server.

### The winning demo loop

1. Start with two paired desktop devices and Wi-Fi disabled.
2. Import a deliberately messy, sanitized browser CSV on Device A.
3. Local AI suggests field mappings, duplicate grouping, and tags using only redacted metadata.
4. The user reviews and confirms the proposed organization.
5. The user asks a vague question such as “my work Google account for Company X.”
6. The assistant finds the entry while keeping the password hidden.
7. The user explicitly unlocks and opens the entry.
8. The user edits a non-secret field or adds a tag.
9. The encrypted change syncs directly to Device B over the local network through the QUIC sync layer.
10. Show that the AI process has no network access and that the local mode needs no server.

### The deployment and continuity proof

After the core loop is stable, show the product's second differentiator in a short, separate sequence:

1. Start the same application stack from Docker on an always-on local machine.
2. Pair a user device with the self-hosted node and show encrypted sync through that node.
3. Configure a test-only emergency package containing a recovery instruction and selected encrypted vault material.
4. Set a short test grace period and stop the user's heartbeat.
5. Show the grace-period warning and cancellation path.
6. Cancel once to prove the owner remains in control.
7. Run the test again and show the encrypted package becoming available to the designated recipient only after the grace period.

The Dead Man's Switch is a continuity feature, not a second AI feature. Keep it deterministic, explicit, and testable. Do not demo real personal secrets or a real emergency recipient.

This is the product. Everything else is secondary until this loop works repeatedly.

### What makes it special

The differentiator is the combination, not any single feature:

- **Useful local AI:** The assistant does real organization and retrieval work, not a generic chat window.
- **Secret-field isolation:** The model sees only a code-generated metadata projection and never sees password values or other secret fields.
- **Offline operation:** The AI continues working with Wi-Fi disabled.
- **Direct sync:** Encrypted vault changes move device-to-device through a QUIC-based, Syncthing-style transport instead of a central server.
- **No forced learning curve:** A user can import messy data and ask for what they need in ordinary language.

QUIC is valuable here because it is the transport behind a direct, resumable, authenticated device-sync experience. Do not pitch QUIC alone as the user benefit. Pitch “my devices sync directly without a password company seeing my vault,” and use QUIC as the technical proof of how that works.

### P0: Must have for the hackathon demo

- Local encrypted vault storage using SQLite or an equivalent encrypted local store.
- One local user account with lock and unlock states.
- Secret entry types limited to login, note, and API key for the demo.
- Tags as the default organization mechanism.
- Create, view, edit, and search entries.
- Non-AI password generator.
- One representative messy browser CSV import.
- Import preview with AI-suggested mappings, tags, and duplicate groups.
- Local AI Assistant running in a sandboxed process with network access disabled.
- Redacted metadata boundary enforced in code before model invocation.
- Ask Your Vault over metadata, with secret values hidden until explicit unlock.
- One direct sync path between two paired desktop devices.
- Device identity and authenticated pairing using vetted primitives.
- A clear demo status showing whether the current operation is local, syncing directly, or blocked.
- Offline demo path with Wi-Fi disabled.
- README, disclosure inventory, setup instructions, and a public GitHub repository.

### P1: Only after the winning demo is stable

- Auto-Tagging as a dedicated workflow beyond import.
- Per-entry history with 30-day Undo.
- A minimal Conflict Queue for one reproducible simultaneous-edit case.
- Plain-language conflict explanation without automatic resolution.
- Pairing by QR code in addition to a word phrase and confirmation number.
- Honest benchmark and latency dashboard.
- A reproducible Docker self-host deployment with a local relay and heartbeat service.
- Dead Man's Switch test mode with an encrypted emergency package, heartbeat, warning period, cancellation, and recipient release.

### P2: Roadmap, not hackathon scope

- Managed cloud relay, Cloudflare deployment, billing, and operations.
- Android mobile app via Expo (`https://expo.dev/`).

  The repository now contains an Expo mobile client (`apps/mobile`). This is an explicit post-MVP scope deviation: desktop web remains the primary hackathon release path, and mobile work must not displace the P0 desktop, offline, AI, or sync acceptance criteria.
- Enterprise roles, ACLs, audit logs, and organization recovery.
- Full estate workflows, Legacy Readiness, multiple recipients, legal workflows, and policy controls.
- Crypto wallet entry workflows.
- Broad file attachments and arbitrary import formats.
- Full conflict leases and multi-device history.

### Scope cutoff

The P0 winning demo is the release target. Once the complete demo loop works three times in a row, stop adding features. P1 work must not destabilize offline AI, direct sync, or submission materials.

## 8. Local AI Assistant

### User-facing capabilities

#### Ask Your Vault

The user asks a natural-language question such as “my work Google thing for Company X.” The assistant searches redacted metadata and returns matching entries, with values hidden until the user explicitly unlocks and opens an entry.

#### Smart Import

The assistant maps columns and unstructured records from a supported import source into structured entries, proposes tags, identifies likely duplicates, and presents a review screen before any records are written.

#### Auto-Tagging

The assistant suggests nested tags such as `Google > Work > Company X`. The user accepts, edits, or rejects suggestions. Corrections are stored in an encrypted local preference store; there is no fine-tuning and no vault metadata is placed in model weights.

#### Conflict Assistant

For a sync conflict, the assistant explains the competing metadata states in plain language and recommends a resolution with a reason. Conflicts are never silently discarded. Only one device can resolve a conflict at a time through a Resolver Lock.

#### Vault Health Coach

Deterministic code identifies weak and reused passwords. The assistant explains the findings in plain language and prioritizes what to fix first. The product must say exactly that the detection is deterministic and the AI provides explanation and prioritization.

#### Legacy Readiness (optional)

The assistant can identify missing critical-account categories and help assemble an emergency kit for the Dead Man's Switch. This is not part of the P0 demo unless the core experience is already stable.

### AI behavior requirements

- The proposed small-device default is Qwen3 0.6B, delivered as a reviewed quantized GGUF artifact through `llama.cpp`; the exact artifact remains unselected until its hash, license, redistribution status, and target-device evaluation are recorded (`models/manifest.json` is `tbd`). Ollama is permitted for development only (`qwen3:0.6b` is the intended dev model; the code currently defaults to `llama3.2`/`llama3`).
- Current implementation: the API calls Ollama over HTTP on a loopback endpoint. The adapter accepts only `localhost`, `127.0.0.1`, or `::1` hostnames. This is an application-layer loopback restriction; the repository does not implement a production `llama.cpp` launcher or an OS-level network/filesystem sandbox (see `docs/disclosures.md`).
- Use the proposed small-device Qwen3 0.6B model, or a measured replacement of comparable size, selected through the documented evaluation gate.
- Use a small embedding model only if it improves measured retrieval quality enough to justify the additional complexity.
- The model has no tools and cannot invoke network, filesystem, vault, or mutation operations.
- Outputs use constrained JSON and are validated against a schema before display.
- User confirmation is required before applying tags, import mappings, deduplication decisions, or conflict resolutions.
- AI failure, timeout, malformed output, or unavailable model must degrade to manual vault functionality.
- The AI is blind while the vault is locked.
- Crypto wallet entries, including their titles and metadata, are excluded from the AI view entirely.

## 9. Data Access and Security Model

### Security claim

The product should be described as **offline, sandboxed, and blind to every secret field**. Do not call it “zero-knowledge AI.” No security audit has been completed.

### Redacted AI view

The trusted application layer creates the AI input. Redaction is code, not an instruction to the model. Depending on the task, the model may receive:

- Entry title, except for crypto wallet entries
- Domain or service identifier
- Tags
- Created and updated timestamps
- Deterministic strength and reuse flags
- Import source and non-secret field labels
- Conflict metadata needed to explain a difference

The model must never receive:

- Passwords
- TOTP seeds
- Recovery codes
- Seed phrases
- Private keys
- Secret values
- Note bodies
- File contents
- Crypto wallet titles or metadata
- Vault keys or recovery phrases

### Threat mitigations

| Threat | Required mitigation |
| --- | --- |
| Sensitive metadata reveals banks, clinics, or wallets | Treat metadata as confidential; exclude crypto wallet entries entirely |
| Search index or embeddings can be inverted | Encrypt the index with the vault key; keep it unavailable while locked |
| Prompt injection in titles, imports, notes, or synced entries | Treat all content as untrusted; no model tools; constrained JSON; deterministic facts; user confirmation |
| Redaction is bypassed by prompt wording | Perform redaction in a separate trusted layer before model invocation |
| Local AI endpoint is exposed | Use a Unix socket or stdio with an auth token in production; use Ollama only for development |
| Model or native parser supply-chain risk | Pin model sources, verify file hashes, and document versions and licenses |
| AI process reads vault keys or exfiltrates data | Run with no network, read-only filesystem, least privilege, and no vault-key access |
| LLM runtime increases attack surface | Keep the core vault functional with AI disabled and contain the runtime in a sandbox |
| Learning leaks vault data | Store corrections in an encrypted local preference store; do not fine-tune |
| Hallucinated security advice | Generate strength and reuse facts deterministically; restrict AI to explanation and prioritization |

### Lock behavior

- Locking the vault must revoke the AI's metadata access.
- The AI process must not retain prompts, results, caches, or crash dumps containing entry data.
- Logs must use event identifiers and error categories rather than entry content.
- Unlocking must be explicit and user initiated.

## 10. Core Vault Requirements

### Storage and entries

- Store vault data locally in an encrypted local store. The current implementation uses `better-sqlite3` with application-layer encryption (`node:crypto` aes-256-gcm, scrypt key derivation) rather than SQLCipher.
- Support login, note, and API key entries for the hackathon demo. Card, crypto wallet, and file entries remain product-roadmap types.
- Use tags as the default organization tool; provide folders only for specific use cases.
- Generate passwords through non-AI code using a cryptographically secure random source.
- Encrypt the search index with the vault key, or defer the index until the encryption boundary is implemented correctly.

### Account and recovery

- Use one local account with many paired devices in local mode.
- Generate a 24-word recovery phrase at setup, or clearly mark recovery as a post-demo blocker if the implementation is not ready.
- Show the phrase once, warn that it cannot be recovered by the provider, and provide a print-friendly view.
- Never send recovery phrases or vault keys to the AI process or managed-cloud provider.

### Sync and pairing

- Direct device sync uses QUIC in the intended architecture. The implemented transport is an in-memory `DirectPeerTransport` test harness (`packages/shared/src/sync/transport.ts`); a native QUIC transport is not yet implemented.
- Pair devices with a QR code or a word phrase plus a confirmation number for devices without cameras.
- Assign each device an Ed25519 keypair (`node:crypto`); the device ID is the hash of its public key.
- A PAKE such as SPAKE2 is the intended pairing direction. The current implementation uses a custom HMAC-based pairing exchange built on `node:crypto`. Do not invent cryptography.
- Browser JavaScript cannot open raw UDP; desktop sync requires a native bridge or companion process.
- For the hackathon, demonstrate one authenticated paired-device sync path. Full conflict queues, leases, and history are roadmap work unless the basic sync is already reliable.

### Self-hosted deployment and Dead Man's Switch

These are P1 capabilities and must not delay the offline AI and direct-sync demo.

- The self-hosted package runs as a single Docker container or compose stack.
- The self-hosted node provides an authenticated relay/heartbeat endpoint; it never receives vault keys or plaintext secret fields.
- The node stores encrypted synchronization data and an encrypted emergency package only.
- The owner configures a heartbeat interval, grace period, recipient, and cancellation method.
- The owner must explicitly create and approve an emergency package. The package must identify its contents and intended recipient.
- The switch enters a warning state when heartbeats stop; it does not release anything immediately.
- The owner can cancel the warning during the grace period with a valid local unlock or recovery flow.
- After the grace period, the recipient receives access to the encrypted emergency package through an authenticated release flow.
- The recipient must still possess the required recovery material or authorization; the switch must not bypass vault encryption.
- The implementation must include a test mode with short timers and fake recipient data.
- The switch must be deterministic and auditable. The AI does not decide when to trigger it, who receives it, or what is released.
- The demo must state that this is a prototype and not a substitute for legal estate planning or a security audit.

## 11. Functional Requirements

### Vault lifecycle

| ID | Requirement | Priority |
| --- | --- | --- |
| VAULT-001 | User can create a local vault and receive a 24-word recovery phrase | P0 |
| VAULT-002 | User can lock and unlock the vault | P0 |
| VAULT-003 | Vault data is encrypted at rest | P0 |
| VAULT-004 | AI cannot access metadata while the vault is locked | P0 |
| VAULT-005 | User can export or print recovery instructions without exposing them to AI | P1 |

### Entries and organization

| ID | Requirement | Priority |
| --- | --- | --- |
| ENTRY-001 | User can create, edit, view, and delete supported entries | P0 |
| ENTRY-002 | User can generate a password without AI | P0 |
| ENTRY-003 | User can add, remove, and edit tags | P0 |
| ENTRY-004 | User can search entries using ordinary text | P0 |
| ENTRY-005 | User can store crypto wallet entries excluded from AI | P1 |
| ENTRY-006 | User can store bounded file attachments | P1 |
| ENTRY-007 | User can inspect entry history and undo changes within 30 days | P1 |

### AI workflows

| ID | Requirement | Priority |
| --- | --- | --- |
| AI-001 | Assistant runs without network access in the demo environment | P0 |
| AI-002 | Trusted code produces the redacted metadata view before inference | P0 |
| AI-003 | Ask Your Vault returns useful metadata matches without exposing values | P0 |
| AI-004 | Smart Import previews mappings, tags, and duplicates before writing | P0 |
| AI-005 | Import tag suggestions require user confirmation | P0 |
| AI-006 | Health checks are deterministic and AI explanation is roadmap work | P1 |
| AI-007 | Malformed model output cannot mutate vault state | P0 |
| AI-008 | AI process has no tools and cannot perform network or filesystem actions | P0 |
| AI-009 | Conflict Assistant explains and recommends, but never silently resolves | P1 |
| AI-010 | Corrections are stored locally in encrypted preferences without fine-tuning | P1 |

### Deployment and continuity

| ID | Requirement | Priority |
| --- | --- | --- |
| DEPLOY-001 | Self-hosted Docker stack starts with documented commands | P1 |
| DEPLOY-002 | Self-hosted node stores only encrypted sync data and emergency packages | P1 |
| DEPLOY-003 | User can configure a heartbeat and grace period in test mode | P1 |
| SWITCH-001 | User can create and approve an encrypted emergency package | P1 |
| SWITCH-002 | Missed heartbeats enter a warning state before release | P1 |
| SWITCH-003 | User can cancel the warning during the grace period | P1 |
| SWITCH-004 | Test recipient can access the package only after the grace period and authentication | P1 |
| SWITCH-005 | The switch never bypasses vault encryption or releases plaintext automatically | P1 |
| SWITCH-006 | Trigger, warning, cancellation, and release events are auditable | P1 |

### Import

| ID | Requirement | Priority |
| --- | --- | --- |
| IMPORT-001 | User can select a supported source file | P0 |
| IMPORT-002 | User sees a preview before import is committed | P0 |
| IMPORT-003 | Import detects likely duplicates for review | P0 |
| IMPORT-004 | Import does not send source content to a cloud API | P0 |
| IMPORT-005 | Failed rows are reported without losing successfully reviewed rows | P1 |

## 12. UX Requirements

### Primary user journey

1. User creates or opens a local vault.
2. User imports a messy CSV or spreadsheet export.
3. Assistant proposes mappings, tags, and duplicate groups.
4. User reviews and confirms the proposal.
5. User asks a vague question in natural language.
6. Assistant returns likely entries using metadata only.
7. User explicitly unlocks and opens the selected entry to view its secret.
8. User can disable the assistant and continue using the core vault.

### UX rules

- Always distinguish a suggestion from an applied change.
- Show why the assistant made a suggestion when practical.
- Make the local/offline status visible during the demo.
- Do not display secrets in AI prompts, debug panels, telemetry, or error messages.
- Use clear empty, loading, timeout, and model-unavailable states.
- Make destructive actions explicit and reversible where possible.
- Keep the core flow usable by a non-technical user without teaching tags or import schemas.

## 13. Architecture and Technology Direction

| Layer | Direction | Notes |
| --- | --- | --- |
| Frontend | Single-page app, desktop view first | Android via Expo (`https://expo.dev/`) later |
| Backend | Hono | Runs on Cloudflare Workers and in Docker |
| Local storage | `better-sqlite3` with application-layer encryption | Local-first default; SQLCipher is not in use |
| Device sync | Intended QUIC, Syncthing-style | Implemented transport is an in-memory `DirectPeerTransport` test harness (`packages/shared/src/sync/transport.ts`); native QUIC transport is not yet implemented |
| Device identity | Ed25519 (`node:crypto`) | ID is a hash of the public key |
| Pairing | Custom HMAC-based pairing exchange (`node:crypto`) | SPAKE2/PAKE is the intended direction, not the current implementation |
| Cryptography | `node:crypto` (aes-256-gcm, scrypt, ed25519) | libsodium is not in use; never hand-roll cryptography |
| AI runtime | Ollama HTTP on loopback (dev); `llama.cpp` intended for production | No OS-level sandbox; application-layer loopback restriction only |
| AI models | Small quantized LLM plus optional embedding model | Benchmark quality, latency, and license |
| AI process | Local-only socket or stdio, sandboxed | No network; read-only filesystem |
| Demo hardware | Team lead's laptop with RTX 4050 | Install and test CUDA early |
| Managed cloud | Cloudflare Workers, D1, R2 | Product direction; not required for the hackathon |
| Self-hosting | Docker | P1 prototype; local relay and heartbeat only |
| CI | Git with CI on every PR | Never expose secrets to forked PRs |

## 14. AI Evaluation Plan

Create a small, versioned evaluation set containing representative, sanitized metadata and import cases. Do not use real passwords, recovery phrases, seed phrases, or private keys.

Measure at minimum:

- Ask Your Vault retrieval accuracy, such as top-1 and top-3 success rate
- Smart Import field-mapping accuracy
- Duplicate-detection precision on known duplicate and non-duplicate pairs
- Import tag-suggestion acceptance rate on a reviewed sample
- Median and p95 latency per workflow on the demo laptop
- Malformed or schema-invalid output rate
- Offline success rate with Wi-Fi disabled

Record model version, runtime version, quantization, hardware, test-set version, input size, and number of runs. Publish only honest results and label them as internal evaluation results.

## 15. Success Metrics and Acceptance Criteria

### Hackathon acceptance criteria

- [ ] The core vault works with the AI process disabled.
- [ ] The Local AI demo completes with Wi-Fi disabled.
- [ ] A supported messy import produces a reviewable structured result.
- [ ] Ask Your Vault finds a seeded test entry from a vague query without showing its secret value.
- [ ] At least one tag suggestion is accepted by the user and persisted.
- [ ] Weak/reused-password detection is either excluded from the demo or clearly labeled as deterministic code; it is not presented as an AI capability.
- [ ] No password, TOTP seed, recovery code, seed phrase, private key, note body, or file content reaches the model.
- [ ] Malformed model output is rejected and does not mutate the vault.
- [ ] Turning off AI leaves a usable plain vault.
- [ ] A change made on Device A appears on Device B through direct sync without a server.
- [ ] The team can explain what runs locally and what requires the internet.
- [ ] The public repository contains setup instructions and all required disclosures.

### Product success metrics

- 80% or higher top-3 retrieval success on the internal Ask Your Vault evaluation set.
- 90% or higher valid-schema output rate on the supported workflows.
- 95% or higher successful completion rate for the P0 demo flow across repeated runs.
- 0 secret-field exposures in redaction tests.
- 0 network requests from the production AI sandbox during an offline test.
- A first-time non-technical tester can import, review, search, and open an entry without assistance in a moderated test.

These targets are engineering goals, not claims to make in the pitch unless measured and documented.

## 16. Testing Strategy

### Automated tests

- Encryption and lock-state tests
- Redaction allowlist and denylist tests
- Tests proving crypto wallet entries are excluded from AI metadata
- Schema validation and malformed-output tests
- Import mapping and duplicate-detection tests
- Password strength and reuse tests
- Conflict and Resolver Lock state tests
- Search behavior and index encryption tests
- AI sandbox network-denial tests

### Manual release test

1. Start from a fresh installation.
2. Create a vault and record the recovery phrase using a test-only account.
3. Import the sanitized fixture with Wi-Fi enabled, review, and confirm.
4. Lock the vault and verify the AI receives no metadata.
5. Disable Wi-Fi and unlock the vault.
6. Run Ask Your Vault and Smart Import fixture replay.
7. Inspect logs and crash output for entry data.
8. Change a tag or non-secret field on Device A and verify direct sync to Device B.
9. Disable AI and repeat the core vault flow.
10. Verify the public repository and setup instructions from a clean environment.

## 17. Submission and Demo Requirements

The submission must include:

- Project name, short description, and team members
- Public GitHub repository before 10:00 AM on October 10
- Approximately one-minute demo video
- X or LinkedIn video URL tagging Devin / Cognition and including `#AppBuildersPH`
- Exact breakdown of what runs locally and what requires internet
- Models, technologies, frameworks, APIs, cloud services, existing code/assets, and AI development tools used
- Direct answer to: “Why does this product benefit from running AI locally?”

### Recommended five-minute pitch structure

1. **0:00–0:45:** Show the messy vault problem and the target user.
2. **0:45–2:30:** With Wi-Fi off, import messy data and show the assistant organizing it.
3. **2:30–3:30:** Ask a vague question and show metadata-only retrieval followed by explicit unlock.
4. **3:30–4:15:** Show redaction, sandbox, and direct device-to-device sync.
5. **4:15–4:45:** Explain the local advantage and what works when AI is disabled.
6. **4:45–5:00:** If stable, show the self-hosted heartbeat and Dead Man's Switch as the continuity extension. Otherwise, end on direct sync and do not show an unreliable feature.

## 18. Business Model and Licensing

### Business model assumptions

Prices and figures are assumptions to validate, not commitments.

| Block | Direction |
| --- | --- |
| Customer segments | Individuals and families, technical users and homelabbers, small and medium organizations |
| Value proposition | Offline AI organization, secrets stay on devices, local/self-hosted/cloud options, no vendor lock-in |
| Channels | Public repository and docs, developer communities, hackathons, campus exposure, direct outreach |
| Customer relationships | Free self-service, community support, contracted support and enterprise SLA |
| Revenue | Managed-cloud per-seat subscription, enterprise tier, commercial licensing, paid support and setup |
| Key resources | Codebase, offline AI pipeline, evaluation set, encryption design, team, brand, trust |
| Key activities | Product development, security review, evaluation, cloud operations, community, documentation |
| Partners | Cloudflare, open-weight model authors, audited cryptography libraries, security reviewers |
| Costs | Developer time, Cloudflare D1/R2 hosting, security audit, support, legal and licensing |

### License constraints

Fair-code means source-available rather than OSI-approved open source. Before shipping:

- Confirm the final license and its commercial-use terms.
- Check every dependency and AI model license for redistribution, commercial use, and modification restrictions.
- Document third-party code and assets.
- Do not describe the product as open source unless the final license qualifies.

## 19. Competitive Positioning

The following are positioning hypotheses, not verified market facts. Verify current competitor product pages before using them in a public pitch.

### Digital estate vaults

Examples: Everplans, GoodTrust, Eternal Vault.

Positioning hypothesis: these products focus on post-loss continuity and centralized services. Verma is a day-to-day secrets manager whose normal use keeps the record current, with local AI identifying stale or missing critical accounts.

### Password managers and ecosystem vaults

Examples: Bitwarden, 1Password, Apple Legacy Contact, Google Inactive Account Manager.

Positioning hypothesis: users often choose between a commercial cloud provider and self-hosting complexity, while native tools are ecosystem-specific. Verma offers local, self-hosted, and managed modes with metadata-only local AI.

### Bereavement concierges

Examples: Empathy, Settld, ClearEstate.

Positioning hypothesis: these services act primarily after a loss. Verma captures everyday credentials and supports proactive continuity before a crisis.

### Cryptocurrency succession products

Examples: Casa, Bitkey, Sarcophagus.

Positioning hypothesis: these products focus on blockchain assets or complex custody workflows. Verma covers a broader secret surface while still isolating crypto wallet entries from the AI.

Keep the pitch focused on the daily password-manager problem, Local AI Assistant, and direct sync. Present self-hosting and the Dead Man's Switch as a credible continuity extension, not as the core product. Show them only if the test-mode flow is deterministic and repeatable.

## 20. Open Questions and Risks

- Which exact model and quantization meet the quality/latency target on the RTX 4050?
- Can the desktop bridge support QUIC in time without weakening the web-first scope?
- Can the self-hosted Docker relay and heartbeat run reliably enough to justify a short secondary demo?
- Does the emergency-package release model remain useful without bypassing encryption or creating a dangerous false sense of recovery?
- Which encrypted SQLite implementation is compatible with all target deployment modes?
- What exact file-size limit is acceptable for the MVP?
- Which import format gives the strongest demo with the least parser complexity?
- How will the local AI process be sandboxed on each supported operating system?
- Which fair-code license is legally appropriate for the business model?
- Which models can legally be bundled, downloaded, or redistributed?
- What metadata is necessary for each AI workflow, and can the allowlist be reduced further?
- Can the team complete a meaningful security review before making public security claims?
- Are the competitor positioning claims current and supportable?

## 21. Immediate Build Checklist

- [ ] Lock the P0 scope and cut list.
- [ ] Create sanitized demo fixtures with no real secrets.
- [ ] Implement encrypted local vault and lock state.
- [ ] Implement the redaction layer as an explicit trusted module.
- [ ] Run the model in a no-network sandbox.
- [x] Build Smart Import preview and confirmation.
- [ ] Build Ask Your Vault over metadata.
- [ ] Add direct sync between two paired desktop devices.
- [ ] Add Auto-Tagging or Health Coach only if the P0 demo is already stable.
- [ ] Add the Docker self-hosted relay only after direct sync is reliable.
- [ ] Add Dead Man's Switch test mode: encrypted package, heartbeat, warning, cancellation, and authenticated release.
- [ ] Test the switch only with fake recipient data and fake emergency content.
- [ ] Test with Wi-Fi disabled on the RTX 4050 laptop.
- [ ] Capture latency and accuracy measurements.
- [ ] Write setup, architecture, local/cloud boundary, and disclosure documentation.
- [ ] Record the one-minute demo.
- [ ] Verify the public repository and every submission link.

## 22. Team Ownership and Project Operations

Work is managed in the Verma GitHub Project. Each issue has one accountable owner, one milestone, and explicit dependencies. The project workflow is designed so agents can work independently while blockers and release risks remain visible.

| GitHub username | Primary ownership | Expected outputs |
| --- | --- | --- |
| `whinee` | Backend, infrastructure, QA, E2E testing | Storage APIs, sync services, test harnesses, CI checks, release verification |
| `Faiithal` | Frontend and backend | Vault flows, API integration, import/search UI wiring, application behavior |
| `helenaherrero515` | Frontend and UI/UX | Desktop-first screens, interaction states, review/confirmation flows, responsive polish |
| `HitsukiMok` | DevOps, project management, business research | CI/CD, Docker/release operations, issue/milestone coordination, competition and market evidence |

### Project workflow

The board uses these states:

- **Backlog:** accepted idea or task not yet prepared for implementation
- **Ready:** dependencies are resolved and the issue has enough detail to start
- **In Progress:** the assigned owner is actively implementing it
- **Blocked:** a dependency, decision, environment, or review prevents progress
- **Done:** implementation and acceptance checks are complete

Every issue uses a matching workflow label. Issues that include `blocked by #N` remain blocked until the referenced issue is closed. Repository automation checks dependent issues after a blocker closes and promotes fully unblocked work to Ready. Project status is kept aligned with the issue label by the project automation workflow.

### Agent execution rules

- Agents must select work from the Ready column and claim the assigned issue before editing code.
- Agents must not start P1 Continuity work while P0 AI and Direct Sync acceptance checks are failing.
- Agents must add tests or verification evidence to the issue before requesting review.
- Agents must stop and report a blocker when a task requires an unapproved scope change, missing secret, unavailable model, or security exception.
- `HitsukiMok` owns final scope decisions, milestone movement, release coordination, and submission readiness.
