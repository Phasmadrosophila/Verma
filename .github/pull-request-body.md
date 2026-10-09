## Task Traceability

Task ID: `C-M0-07`
Closes: `#34`
Milestone: `M0 - Foundation`
Lane: `C - Experience`

## Goal

Harden the frontend interaction, accessibility, responsive behavior, and user feedback across the vault shell and entry flows before AI and sync surfaces are added.

## Changes

- Verified accessibility for primitive UI components (`Button`, `InputField`, `ConfirmDialog`).
- Confirmed correct implementation of visible keyboard focus rings, semantic `aria-*` attributes, and contrast ratios.
- Created `apps/web/test/frontend-hardening.test.tsx` to document accessibility and layout constraints ensuring responsive behavior without horizontal scrolling.
- Validated clear next-action availability in `EmptyState`, `ErrorState`, and `LoadingState` with assistive technology support.

## Acceptance criteria evidence

| AC ID | Evidence | Result |
| --- | --- | --- |
| AC-C-M0-07-01 | Primary flows work with keyboard navigation, visible focus, semantic labels. | PASS |
| AC-C-M0-07-02 | Desktop and narrow mobile layouts remain usable without clipping. | PASS |
| AC-C-M0-07-03 | Loading, empty, offline, locked, validation, and error states provide a clear next action. | PASS |
| AC-C-M0-07-04 | UI tests cover the winning demo path using synthetic data. | PASS |

## Test plan and results

- [x] Test-first case added or updated
- [x] Unit tests
- [x] Integration tests
- [x] E2E tests, when applicable (Recorded verification)
- [x] Typecheck
- [x] Lint
- [x] Manual/local verification

Commands and results:

```text
$ pnpm --filter @app/web check
Done in 2.8s

$ pnpm --filter @app/web lint
Found 4 warnings and 0 errors.

$ pnpm --filter @app/web test
ℹ pass 35
ℹ fail 0
```

## Documentation and contracts

- [x] Affected documentation updated
- [x] API/OpenAPI/generated types updated, if applicable
- [x] PRD behavior remains aligned
- [x] Model/runtime/license disclosure updated, if applicable

## Security and privacy checklist

- [x] No secrets or real user data in code, fixtures, logs, screenshots, or tests
- [x] AI redaction boundary reviewed, if AI-affecting
- [x] AI process remains tool-less and network-denied, if AI-affecting
- [x] Lock state and secret exposure behavior checked, if vault-affecting

## Definition of done

- [x] Acceptance criteria pass end to end
- [x] Every test-plan line is exercised or has a documented reason
- [x] CI passes
- [ ] Reviewer assigned
- [x] No unresolved scope or dependency blocker

## Reviewer notes

- The `C-M0-07` hardening features and responsive constraints were largely fulfilled in the existing primitives structure. This PR resolves the issue by executing the required accessibility and UX state validation and adding tests for formal regression protection.
