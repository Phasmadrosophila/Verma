# Demo rehearsal: synthetic offline vault loop

**Task:** E-MR-03 / AC-E-MR-03-04
**Pass condition:** two immediately consecutive, human-observed runs on one build, each with all required rows marked `PASS`. `OPEN` and `FAIL` do not count.

## Run card

Complete one evidence file per run using [evidence/rehearsal/run-01.md](evidence/rehearsal/run-01.md) and `run-02.md`. Use the same synthetic fixture set and build SHA for both.

| Segment | Exact action or command | Expected result |
| --- | --- | --- |
| Identify | `git rev-parse HEAD` | SHA matches the evidence header. |
| Offline control | Disable Wi-Fi/Ethernet in the OS UI, then `Get-NetAdapter \| Format-Table -Auto Name, Status, InterfaceDescription` and `Test-NetConnection 1.1.1.1 -Port 443` | Network adapters are disabled and `TcpTestSucceeded : False`. |
| Local status | Launch the approved local build, then observe the status text | Status truthfully identifies local/offline operation. |
| Smart Import | Load only the synthetic CSV; review mappings, tags, duplicate candidates; confirm import explicitly | Preview precedes write, suggestions are reviewable, and secrets stay masked. |
| Ask Your Vault | Submit a synthetic metadata-only query | Relevant metadata match is shown; no secret is revealed without explicit unlock. |
| AI-disabled fallback | Stop/disable the local AI with the approved release control; perform manual vault operation and Smart Import analysis | Manual operations remain available and fallback status is honest. |
| Repeat | Start a fresh synthetic vault and repeat the whole card | Second run has the same pass criteria; do not reuse prior results. |

## Presenter wording

> Verma uses only sanitized demonstration data here. The assistant is shown metadata that the trusted application layer has redacted; passwords remain masked until an explicit unlock. This run is offline, and when local AI is unavailable the vault remains usable through manual controls and deterministic import fallback.

Do not say “zero knowledge,” “security audited,” “no network sandbox,” or “works offline” unless that specific claim has current evidence in the run card. If Ask Your Vault is unavailable in the tested build, say it is not demo-ready and do not replace it with a mock.

## Abort conditions

- A real secret, recovery phrase, or personal account label appears: stop recording, remove the capture from distribution, and restart with sanitized fixtures.
- A secret appears in an AI panel, preview, diagnostic, or log: stop and mark `FAIL`.
- Network remains available, the local/offline status is misleading, fallback blocks manual vault access, or an import writes before confirmation: stop and mark `FAIL`.
- The Ask route is unavailable: mark the Ask row `OPEN`; the rehearsal cannot earn the two-run pass until it is observed on the release device.
