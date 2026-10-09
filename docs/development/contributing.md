# Verma Development Workflow

## Source of truth

The issue is the unit of work. The issue body defines the goal, acceptance criteria, test plan, dependencies, and definition of done. The pull request proves that the issue is complete. Every issue and card uses the same Markdown format so an agent can work from GitHub without guessing which document is authoritative. Daily execution happens on the repository-scoped [Verma Delivery board](https://github.com/orgs/Phasmadrosophila/projects/4).

## Canonical issue shape

Use this exact order and Markdown formatting:

```text
### Task ID
<LANE>-<MILESTONE>-<NN>

### Lane
<lane> (lane:<label>)

### Milestone
<code and name> (GitHub milestone: <exact milestone>)

### Size
XS | S | M | L | XL

### Features
<feature IDs, or None>

### Goal
<one concrete outcome>

### Spec references
<source-of-truth references>

### Acceptance criteria (AC IDs)
- <AC-ID>: <testable behavior>

**Done when**
<observable completion>

### Test plan (write these first — red → green → commit)
- [ ] <named test or recorded verification>

### Dependencies
- Blocked by #<number> `<TASK-ID>`
- None

### Definition of done (AGENTS.md §8)
- [ ] <required completion check>

<sub>Workflow: [docs/development-workflow.md](../../docs/development-workflow.md) · Backlog: [docs/workplan.md](../../docs/workplan.md)</sub>
```

Do not use a generic “Scope” section in place of Goal, do not use vague acceptance criteria, and do not list dependencies without task IDs and issue numbers.

## Issue lifecycle

1. Create an issue from the Engineering Task template.
2. Assign exactly one accountable owner and one milestone.
3. Add a task ID, lane, size, feature IDs, references, acceptance criteria, and test plan.
4. Add `blocked by [<TASK-ID>] <issue title> #N` for every unresolved dependency.
5. Start in Backlog unless the issue is fully specified and unblocked.
6. Move to In Progress when the assigned owner begins work.
7. Open a draft PR using the fully completed `.github/pull_request_template.md` and link the issue. A ready-for-review PR moves the linked issue to In Review; merging moves it to Done.
8. Address review feedback and attach test evidence.
9. Close the issue only after the definition of done is satisfied.

## Commit rules

- Use Conventional Commits for every commit: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`, or another valid type, with an optional scope.
- Commit each major solution checkpoint separately when it advances an acceptance criterion or definition-of-done item.
- A substantive PR must contain multiple meaningful commits. Do not submit a one-commit PR for non-trivial work.
- A single commit is reserved for genuinely trivial changes such as a typo, isolated documentation correction, or equivalent maintenance fix.
- Every PR must use and fully complete `.github/pull_request_template.md`. Replace all placeholders, document acceptance-criteria evidence and command results, complete the security/privacy and definition-of-done checklists, and explain any `N/A` items.
- Do not mark a draft PR ready for review while the template is incomplete or contains placeholder text.

## Board automation

The `Project Automation` workflow synchronizes workflow labels and the repository-scoped Verma Delivery board at `https://github.com/orgs/Phasmadrosophila/projects/4`:

- `status:backlog` -> Backlog
- `status:ready` -> Ready
- `status:in-progress` -> In Progress
- `status:in-review` -> In Review
- `status:blocked` -> Blocked
- `status:done` -> Done

When a blocker closes, automation rechecks all dependent issues. An issue is Blocked while any referenced issue remains open and is promoted to Ready only when every blocker is closed.

The agent does not merge pull requests or enable auto-merge. A human teammate reviews and merges the PR after CI, acceptance-criteria evidence, and the definition of done are satisfied.

## Branch and PR rules

- Use an issue-specific branch following the repository branch convention.
- Keep one logical change per PR.
- Do not merge your own PR.
- Request teammate review after CI passes.
- Update affected documentation in the same PR.
- Never include secrets, real vault data, or unverified benchmarks.

## Night-sprint priority

P0 Foundation, P0 AI Demo, and P0 Direct Sync are the release path. P1 Continuity starts only after the P0 offline AI and direct-sync loop passes repeatedly. Release work owns the final rehearsal, disclosures, public repository check, and submission.
