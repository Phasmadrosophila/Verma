# Rule: Hackathon Scope & Execution Discipline

This rule defines the scope boundaries and time constraints for building **Verma** during the **AppBuildersPH Hackathon 2026: Local AI**.

## 1. Scope Tiers

### P0 — Non-Negotiable Core Demo Target
Do not work on P1 or P2 features until the full P0 winning demo loop runs reliably three consecutive times:
1. Local encrypted SQLite vault storage with user create/lock/unlock lifecycle.
2. 24-word recovery phrase generation and display.
3. 3 core entry types: `login`, `note`, `api_key`.
4. Tag-based organization.
5. Deterministic, non-AI password generator.
6. Messy browser CSV import preview with AI-suggested mappings, tags, and duplicate detection.
7. Ask Your Vault natural-language metadata search (passwords stay masked until explicit user unlock).
8. Sandboxed local AI inference (`llama.cpp`) operating with Wi-Fi disabled.
9. Direct QUIC-based device-to-device sync between two paired desktop nodes without a server.
10. Offline demo proof and honest performance metrics.

### P1 — Stretch Goals (Only After P0 is Locked & Stable)
- Auto-Tagging dedicated workflow.
- 30-day per-entry history / undo.
- Minimal conflict queue with plain-language explanation and Resolver Lock.
- QR-code pairing in addition to word phrase + confirmation number.
- Self-hosted Docker container with local relay & heartbeat service.
- Dead Man's Switch test mode (encrypted emergency package, heartbeat, grace period warning, cancellation, authenticated recipient release).

### P2 — Out of Scope for Hackathon
- Cloudflare managed cloud multi-tenant service, billing, and SLAs.
- Android mobile app via Expo (`https://expo.dev/`).
- Enterprise roles, ACLs, and organization recovery.
- Crypto wallet entry workflows.
- Arbitrary file attachments.

## 2. Overnight Timeline & Execution Rules

- **Reliability > Scope:** Half the judging score is usefulness and real Local AI implementation. Never sacrifice reliability or offline stability for extra features.
- **3:00 AM Feature Freeze:** At 3:00 AM, freeze all feature development. Only bug fixes, demo stabilization, documentation, and submission materials are allowed after this milestone.
- **Honest Disclosures:** Disclose all models, libraries, and existing assets used. Never fabricate or inflate latency/benchmark metrics.
