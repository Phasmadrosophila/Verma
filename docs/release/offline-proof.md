# Offline proof procedure

**Task:** E-MR-03 / AC-E-MR-03-04
**Scope:** the release rehearsal proof for the synthetic-only vault flow. This document does not claim a live GUI, Wi-Fi-disabled, or sandbox inspection was run from this checkout.

## Evidence rules

- Use only the repository's synthetic fixtures. Do not enter, paste, screenshot, or log a real password, API key, recovery phrase, note body, or personal account name.
- Record the operator, ISO-8601 timestamp with offset, build SHA, exact command or UI action, expected result, actual result, and `PASS`, `FAIL`, or `OPEN` for every step.
- `OPEN` is required until a human performs a GUI or physical-network action on the release device. It is not a pass.
- Keep passwords masked in screenshots and redact window titles or browser tabs that reveal private account metadata.

## Preflight: exact commands

Run from the repository root. Capture only the exit code and the summarized test result in the evidence record; do not paste fixture contents into the record.

```powershell
git rev-parse HEAD
pnpm --filter @app/shared test
python scripts/models/evaluate_artifact.py --check-all
powershell -ExecutionPolicy Bypass -File scripts/rehearsal/verify-rehearsal-docs.ps1
```

| Check | Expected | Actual for this preparation | Status | Timestamp | Operator | Build |
| --- | --- | --- | --- | --- | --- | --- |
| Synthetic shared-suite | 55 tests pass; Smart Import preview has masked synthetic passwords and no live credential patterns | 55 passed, 0 failed | PASS | 2026-10-10T00:26:13+08:00 | Codex worker | `c7a68b7aef42f5e7561c2e3e0309f5da33dac686` |
| Model evaluation fixture gate | Candidate and synthetic fixtures pass; output includes `AC-B-M1-05-04 PASS` | Exit 0; reported `AC-B-M1-05-04 PASS` | PASS | 2026-10-10T00:26:13+08:00 | Codex worker | `c7a68b7aef42f5e7561c2e3e0309f5da33dac686` |
| Full workspace suite | All workspace tests pass | API suite blocked before tests: `@app/shared/dist/index.js` missing; shared suite passed | FAIL | 2026-10-10T00:25:00+08:00 | Codex worker | `c7a68b7aef42f5e7561c2e3e0309f5da33dac686` |

The full-suite failure is a pre-existing build-order issue, not proof that the UI flow fails. Re-run it after `pnpm --filter @app/shared build` (or the repository's approved build command) is available; record the new outcome without overwriting this failure.

## Human release-device procedure

These controls must be performed by a human on the exact demo device. Do not substitute an automated fixture result for any of them.

1. Record `git rev-parse HEAD`, operator, device/OS, and the local model/runtime version in the run evidence.
2. Disconnect Wi-Fi and any wired/Ethernet adapter through the operating-system UI. Run `Get-NetAdapter | Format-Table -Auto Name, Status, InterfaceDescription` and save a redacted screenshot showing the adapters disabled. Do not disable a remote operator's connection.
3. Run `Test-NetConnection 1.1.1.1 -Port 443`; expected result is `TcpTestSucceeded : False`. A failed name lookup alone is insufficient evidence.
4. Launch the already-installed local build using the release team's approved command. Record the exact command, not an inferred one.
5. Confirm the visible local/offline status. If it is absent or says it is online, stop and mark the run `FAIL`.
6. Use the provided synthetic browser CSV only. In Smart Import, inspect mappings, tags, and duplicate candidates; confirm no record is written until the explicit confirmation control. Confirm imported secret cells remain masked.
7. In Ask Your Vault, use a synthetic metadata-only query. Confirm returned title/domain/tag metadata is useful and that secret fields remain masked until explicit unlock. If this build still renders the known `Ask Your Vault (Coming soon)` route, record `OPEN` rather than treating the route as a pass.
8. Disable or stop the local AI runtime using the release team's approved control. Verify manual create/edit/search and Smart Import's deterministic mapping remain usable, with an honest model-unavailable indication. Do not claim the model was sandboxed merely because fallback occurred.
9. Repeat steps 4–8 immediately with the same build and a fresh synthetic vault. Both numbered runs must be `PASS` for a two-consecutive-run claim; any `FAIL` or `OPEN` breaks the streak.

## Network and sandbox boundary

`Test-NetConnection` proves the selected outbound TCP path is unavailable during the run; it does **not** prove a process sandbox. The no-network/read-only/toolless AI-process claim requires the runtime-specific sandbox inspection to be recorded by the release operator. Until then, state only: “offline UI flow checked” (if passed), not “sandbox verified.”

Use [demo-rehearsal.md](demo-rehearsal.md) as the timed script and copy the exact results into [evidence/rehearsal](evidence/rehearsal/README.md).
