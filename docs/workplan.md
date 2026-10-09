# Verma Workplan

This is the task registry for the Verma Delivery project. GitHub issues are the executable source of truth; this page defines the lane, milestone, and dependency model used by those issues.

## Milestones

| Code | GitHub milestone | Exit focus |
| --- | --- | --- |
| M0 | P0 Foundation | Encrypted vault, account lifecycle, application shell, CI foundation |
| M1 | P0 AI Demo | Trusted redaction, sandboxed inference, Smart Import, Ask Your Vault |
| M2 | P0 Direct Sync | Pairing, authenticated QUIC transport, direct device sync |
| M3 | P1 Continuity | Self-hosted relay, heartbeat, Dead Man's Switch test mode |
| MR | Release | E2E verification, documentation, demo, and submission |

## Lanes

| Lane | Name | Ownership |
| --- | --- | --- |
| A | Platform | Storage, backend, infrastructure, and security boundary |
| B | AI | Local inference, redaction, import intelligence, and evaluation |
| C | Experience | Frontend and UI/UX |
| D | Sync | Pairing, QUIC transport, and device synchronization |
| E | Release | QA, documentation, DevOps, and submission |

## Task registry

| Task ID | Issue | Owner | GitHub milestone | Blocking |
| --- | --- | --- | --- | --- |
| A-M0-01 | #3 | whinee | P0 Foundation | None |
| C-M0-02 | #4 | Faiithal | P0 Foundation | A-M0-01 |
| C-M0-03 | #5 | helenaherrero515 | P0 Foundation | C-M0-02 |
| A-M0-04 | #12 | HitsukiMok | P0 Foundation | None |
| B-M1-01 | #6 | whinee | P0 AI Demo | A-M0-01 |
| B-M1-02 | #7 | Faiithal | P0 AI Demo | B-M1-01 |
| B-M1-03 | #8 | helenaherrero515 | P0 AI Demo | B-M1-01, B-M1-02 |
| B-M1-04 | #9 | Faiithal | P0 AI Demo | B-M1-01, B-M1-03 |
| D-M2-01 | #10 | whinee | P0 Direct Sync | A-M0-01, C-M0-02 |
| E-MR-01 | #11 | whinee | Release | C-M0-03, B-M1-04, D-M2-01 |
| A-M3-01 | #13 | HitsukiMok | P1 Continuity | A-M0-04, E-MR-01 |
| E-MR-02 | #14 | HitsukiMok | Release | E-MR-01, A-M3-01 |
| B-M1-05 | #27 | whinee | P0 AI Demo | None |
| E-MR-03 | #28 | HitsukiMok | Release | B-M1-05 |
| C-MR-02 | #52 | helenaherrero515 | Release | None |
| C-M0-04 | #31 | helenaherrero515 | P0 Foundation | C-M0-02 |
| C-M0-05 | #32 | Faiithal | P0 Foundation | C-M0-02, C-M0-04 |
| C-M0-06 | #33 | Faiithal | P0 Foundation | C-M0-02, C-M0-04, C-M0-05 |
| C-M0-07 | #34 | helenaherrero515 | P0 Foundation | C-M0-04, C-M0-05, C-M0-06 |
| A-M0-05 | #48 | HitsukiMok | P0 Foundation | None |
| C-M0-08 | #49 | Faiithal | P0 Foundation | A-M0-05, C-M0-04, C-M0-05, C-M0-06 |
| E-MR-04 | #50 | HitsukiMok | Release | A-M0-05, C-M0-08, C-M0-07 |
| C-M0-09 | #55 | Faiithal | P0 Foundation | None |
| C-MR-01 | #19 | HitsukiMok | Release | TODO(verify) |
| B-MR-02 | #60 | whinee | Release | TODO(verify) |
| A-M0-06 | #61 | whinee | P0 Foundation | TODO(verify) |
| TODO(verify) | #59 | helenaherrero515 | Release | TODO(verify) |

## Order of execution

1. Start `A-M0-01` and `A-M0-04`.
2. When `A-M0-01` closes, `C-M0-02` and `B-M1-01` become Ready.
3. When `C-M0-02` closes, `C-M0-03` and `D-M2-01` become Ready when their other dependencies are resolved.
4. Complete `B-M1-01`, then `B-M1-02` and `B-M1-03`; complete `B-M1-04` after import is usable.
5. Complete `D-M2-01` and `E-MR-01` before considering continuity work.
6. Start `A-M3-01` only after the P0 offline AI and direct-sync loop passes repeatedly.
7. Finish `E-MR-02` as the final release gate.
8. Evaluate and document the Qwen3 0.6B candidate before selecting any production artifact or claiming mobile performance.
9. Build the frontend foundation in order: shell and primitives, vault lifecycle, unlocked workspace, then accessibility and demo hardening.
10. Establish the real web/API runtime, integrate frontend screens against it, then run the offline visual E2E harness.
11. Treat the Expo mobile API integration as an explicitly approved scope deviation; keep desktop web and local-first release work as the primary path.

The GitHub Project and issue labels are automated from this dependency model. If the registry and an issue disagree, stop and correct the issue before implementation.
