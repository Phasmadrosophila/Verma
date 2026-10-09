---
name: Engineering Task
about: Create a milestone-scoped, testable Verma implementation task
title: ""
labels: "status:backlog"
assignees: ""
---

## Task ID

`<LANE>-<MILESTONE>-<NN>`

## Lane

`A — Platform` / `B — AI` / `C — Experience` / `D — Sync` / `E — Release`

## Milestone

`M0 — Foundation` / `M1 — AI Demo` / `M2 — Direct Sync` / `M3 — Continuity` / `MR — Release`

## Size

`XS` / `S` / `M` / `L` / `XL`

## Features

`F-##` or `None`

## Goal

<!-- State one concrete outcome. -->

## Spec references

- `docs/prd.md §...`
- `docs/COMPETITION-HANDBOOK.md §...`

## Acceptance criteria (AC IDs)

- `AC-<TASK-ID>-01`: <!-- Testable behavior -->

## Done when

<!-- Observable completion statement. -->

## Test plan (write these first — red → green → commit)

- <!-- Name the test or reproducible verification. -->

## Dependencies

<!-- Use exact syntax: blocked by #N. Use None when there are no blockers. -->

None

## Definition of done (AGENTS.md §8)

- [ ] Referenced acceptance criteria pass end to end.
- [ ] Every test-plan line exists as a test or recorded verification.
- [ ] Typecheck, lint, and tests pass.
- [ ] Affected docs are updated in the same PR.
- [ ] The change is exercised locally or in CI.
- [ ] Privacy rules are respected: no logged content, no secrets, synthetic fixtures only.

## Workflow

`docs/development-workflow.md` · Backlog: `docs/workplan.md`
