# Verma Development Workflow

## Source of truth

The issue is the unit of work. The issue body defines the goal, acceptance criteria, test plan, dependencies, and definition of done. The pull request proves that the issue is complete.

## Issue lifecycle

1. Create an issue from the Engineering Task template.
2. Assign exactly one accountable owner and one milestone.
3. Add a task ID, lane, size, feature IDs, references, acceptance criteria, and test plan.
4. Add `blocked by #N` for every unresolved dependency.
5. Start in Backlog unless the issue is fully specified and unblocked.
6. Move to In Progress when the assigned owner begins work.
7. Open a PR using the required template and link the issue.
8. Address review feedback and attach test evidence.
9. Close the issue only after the definition of done is satisfied.

## Board automation

The `Project Automation` workflow synchronizes workflow labels and the Verma Delivery board:

- `status:backlog` -> Backlog
- `status:ready` -> Ready
- `status:in-progress` -> In Progress
- `status:blocked` -> Blocked
- `status:done` -> Done

When a blocker closes, automation rechecks all dependent issues. An issue is promoted to Ready only when every `blocked by #N` issue is closed.

## Branch and PR rules

- Use an issue-specific branch following the repository branch convention.
- Keep one logical change per PR.
- Do not merge your own PR.
- Request teammate review after CI passes.
- Update affected documentation in the same PR.
- Never include secrets, real vault data, or unverified benchmarks.

## Night-sprint priority

P0 Foundation, P0 AI Demo, and P0 Direct Sync are the release path. P1 Continuity starts only after the P0 offline AI and direct-sync loop passes repeatedly. Release work owns the final rehearsal, disclosures, public repository check, and submission.
