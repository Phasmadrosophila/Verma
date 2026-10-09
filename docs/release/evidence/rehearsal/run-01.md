# Rehearsal run 01

| Field | Value |
| --- | --- |
| Timestamp | 2026-10-10T00:26:13+08:00 |
| Operator | Codex worker |
| Build | `c7a68b7aef42f5e7561c2e3e0309f5da33dac686` |
| Fixture policy | Synthetic-only; no GUI data entered |
| Result | OPEN |

| Step | Exact command/action | Expected | Actual | Status |
| --- | --- | --- | --- | --- |
| Shared synthetic suite | `pnpm --filter @app/shared test` | 55 pass, 0 fail | 55 pass, 0 fail | PASS |
| Offline/fallback fixture gate | `python scripts/models/evaluate_artifact.py --check-all` | Exit 0 and `AC-B-M1-05-04 PASS` | Exit 0 and `AC-B-M1-05-04 PASS` | PASS |
| Network disabled | Human disconnects Wi-Fi/Ethernet; `Test-NetConnection 1.1.1.1 -Port 443` | `TcpTestSucceeded : False` | Not executed in this terminal | OPEN |
| Smart Import GUI | Human reviews synthetic import before confirmation | Suggestions visible; secret cells masked; no write before confirmation | Not executed in this terminal | OPEN |
| Ask Your Vault GUI | Human submits synthetic metadata-only query | Useful metadata result; secrets masked | Not executed in this terminal; route is implemented but human GUI evidence is pending | OPEN |
| AI-disabled GUI fallback | Human disables runtime and uses manual vault/import fallback | Manual controls usable with honest unavailable state | Not executed in this terminal | OPEN |
