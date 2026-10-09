---
name: git-github-workflow
description: >-
  Binding, repository-wide Git and GitHub Issues workflow for every feature in
  Verma. Use whenever implementing, modifying, or proposing a new feature, a
  user-facing behavior change, or a non-trivial enhancement. Ensures a canonical
  GitHub task issue exists first, work happens on an issue-specific branch, the
  repository Project board stays synchronized, a draft pull request is opened
  against `main`, the developer is instructed to have teammates review it, and
  the PR is NEVER merged by the agent.
---
# Git / GitHub Development Workflow (Verma)

This is a binding, repository-wide rule for **Verma**. It applies to **every**
feature that any agent or human developer implements, modifies, or proposes.

Work is tracked via **GitHub Issues**, the repository-scoped **Verma Delivery** Project board, an issue-specific branch, and a pull request. Teammate review is required before merging. The agent **NEVER** merges pull requests.

## Non-negotiable rules

- **One task per branch, PR, and GitHub Issue.** Every feature gets its own canonical task issue, its own branch, and its own pull request. Do not bundle unrelated changes together.
- **Issue before implementation.** Do not begin untracked feature work. The issue must have exactly one accountable assignee, one milestone, a task ID, and explicit dependencies.
- **Use the canonical issue body.** Use the Engineering Task template and preserve the exact Markdown headings, checkbox test plan, checkbox definition of done, and workflow footer documented in `docs/development-workflow.md`.
- **Use the repository board.** Daily execution happens in [Verma Delivery](https://github.com/orgs/Phasmadrosophila/projects/4), not the organization overview board.
- **Do not manually fight automation.** Use workflow labels and dependency syntax; Project Automation synchronizes the issue and board status.
- **NEVER MERGE THE PR BY YOURSELF.** Do not run `git merge`, `gh pr merge`, enable auto-merge, or squash/rebase on GitHub. Implementation is complete when the PR is opened and reported. Merging is strictly reserved for human reviewers.
- **Instruct dev to request teammate review.** Always notify the developer to ask their teammates to review the PR before merging.
- **Never push directly to `main`.** All changes reach `main` exclusively through a reviewed pull request.
- **Never force-push shared branches.** Do not force-push `main` or branches used by teammates.
- **Always abide by Conventional Commits.** Every commit must use a valid Conventional Commits message such as `feat:`, `fix:`, `test:`, `docs:`, `chore:`, or `refactor:` with an optional scope.
- **Commit each major solution checkpoint.** Every major implementation step that advances an acceptance criterion or definition-of-done item must be committed separately. Keep commits focused, reviewable, and independently understandable; do not hide an entire feature in one undifferentiated commit.
- **Do not submit one-commit PRs for substantive work.** A PR covering a non-trivial task must contain multiple meaningful commits representing the major solution checkpoints. A single commit is acceptable only for a genuinely trivial change such as a typo, isolated documentation correction, or equivalent small maintenance fix.

## Workflow

### 1. Ensure a canonical GitHub Issue exists (before implementation)

Every new feature or non-trivial fix MUST have a GitHub Issue before coding begins.

1. Search for existing issues using `gh issue list`.
2. If no issue exists, create one via `gh issue create` using `.github/ISSUE_TEMPLATE/task.md`.
3. Use the title format:

   ```text
   [<TASK-ID>] <FEATURE-ID> <concise outcome>
   ```

   Example: `[B-M1-04] F-04 Ask Your Vault metadata search`.

4. The body must use this order and formatting:
   - `### Task ID`
   - `### Lane`
   - `### Milestone`
   - `### Size`
   - `### Features`
   - `### Goal`
   - `### Spec references`
   - `### Acceptance criteria (AC IDs)`
   - `**Done when**`
   - `### Test plan (write these first — red → green → commit)` with `- [ ]` items
   - `### Dependencies`
   - `### Definition of done (AGENTS.md §8)` with `- [ ]` items
   - The `<sub>Workflow: ...</sub>` footer.

5. Assign exactly one accountable owner and set the matching GitHub milestone.
6. Use `- Blocked by #<number> <TASK-ID>` for unresolved dependencies, or `- None` when unblocked.

### 2. Create an issue-specific branch

Create and switch to a branch tied to the GitHub Issue number. Start from the current `main` after checking that the worktree is clean:

```bash
git checkout -b lyraphasma/issue-<NUMBER>-<short-slug> main
```

Examples:

- `lyraphasma/issue-12-ask-your-vault`
- `lyraphasma/issue-15-encrypted-sqlite-schema`

### 3. Implement on the branch and keep the board accurate

- Follow repository architecture and security standards (see `AGENTS.md` and `.agents/rules/`).
- Verify offline behavior, zero secret-field leakage, and run tests.
- Keep commits focused and well-described.
- Commit each major solution checkpoint as it reaches green. Examples include the core implementation, boundary/error handling, tests, documentation, and integration or verification work when those are separate changes.
- Use a Conventional Commits type and keep the commit body useful when the checkpoint needs context. Do not use vague messages such as `updates`, `work`, or `final changes`.
- Move the issue to `status:in-progress` when implementation actually begins.
- Keep blocker references in the issue body. Open blockers must remain `status:blocked`; when all blockers close, automation promotes the issue to `status:ready`.
- Do not log issue content, vault data, secrets, or real user data.

### 4. Open a draft Pull Request (Do NOT merge)

Push the branch and open a **draft** PR targeting `main`. The PR must link the task issue and use `.github/pull_request_template.md`:

```bash
git push -u origin lyraphasma/issue-<NUMBER>-<short-slug>
gh pr create --draft --base main --title "<type>: <Short description> (#<NUMBER>)" --body "Closes #<NUMBER>

## Summary
<Summary of changes>

## Commit structure
<List the major solution checkpoints and their commit hashes/messages. Confirm this is not a one-commit PR unless the change is genuinely trivial.>

## Verification
<Tests and checks performed>

## Acceptance criteria evidence
<AC IDs and evidence>"
```

PR status automation is authoritative:

- Draft PR -> `In Progress`
- Ready-for-review PR -> `In Review`
- Merged PR -> `Done`
- Closed without merge -> linked issue returns to `Ready` unless it remains blocked.

### 5. Report back and prompt for teammate review

When the draft PR is open, report:

1. GitHub Issue URL and number
2. Working branch name
3. Pull Request URL
4. Checks / tests performed
5. Current issue and board status.
6. **Review Prompt:** Remind the developer to request teammate review, then mark the PR ready for review only after CI and test evidence are complete.

## Repository defaults

- **Upstream repository:** `Phasmadrosophila/Verma`
- **Base branch:** `main`
- **Branch naming:** `lyraphasma/issue-<NUMBER>-<short-slug>`
- **Issue tracker:** GitHub Issues (`gh issue`)
- **PR tracker:** GitHub Pull Requests (`gh pr`)
- **Project board:** Verma Delivery, repository-scoped Project #4
- **Workflow labels:** `status:backlog`, `status:ready`, `status:in-progress`, `status:in-review`, `status:blocked`, `status:done`
