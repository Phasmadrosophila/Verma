---
name: git-github-workflow
description: >-
  Binding, repository-wide Git and GitHub Issues workflow for every feature in
  Verma. Use whenever implementing, modifying, or proposing a new feature, a
  user-facing behavior change, or a non-trivial enhancement. Ensures a GitHub
  issue exists first, work happens on an issue-specific branch, a pull request is
  opened against `main`, the developer is instructed to have teammates review it,
  and the PR is NEVER merged by the agent.
---
# Git / GitHub Development Workflow (Verma)

This is a binding, repository-wide rule for **Verma**. It applies to **every**
feature that any agent or human developer implements, modifies, or proposes.

Work is tracked via **GitHub Issues** and structured through an issue-specific branch and pull request. Teammate review is required before merging. The agent **NEVER** merges pull requests.

## Non-negotiable rules

- **One feature per branch, PR, and GitHub Issue.** Every feature gets its own GitHub Issue, its own branch, and its own pull request. Do not bundle unrelated changes together.
- **NEVER MERGE THE PR BY YOURSELF.** Do not run `git merge`, `gh pr merge`, enable auto-merge, or squash/rebase on GitHub. Implementation is complete when the PR is opened and reported. Merging is strictly reserved for human reviewers.
- **Instruct dev to request teammate review.** Always notify the developer to ask their teammates to review the PR before merging.
- **Never push directly to `main`.** All changes reach `main` exclusively through a reviewed pull request.
- **Never force-push shared branches.** Do not force-push `main` or branches used by teammates.
- **Always abide by Conventional Commits.**

## Workflow

### 1. Ensure a GitHub Issue exists (before implementation)

Every new feature or non-trivial fix MUST have a GitHub Issue before coding begins.

1. Search for existing issues using `gh issue list`.
2. If no issue exists, create one via `gh issue create`:
   - Title: Short and descriptive (e.g., `feat: Add Ask Your Vault search component`).
   - Body: Summary of the feature, purpose, scope, and acceptance criteria.
   - Assignee: Assign to the responsible developer (`@whinyaan` / `Lyra Phasma` or current dev).

### 2. Create an issue-specific branch

Create and switch to a branch tied to the GitHub Issue number:

```bash
git checkout -b lyraphasma/issue-<NUMBER>-<short-slug> main
```

Examples:

- `lyraphasma/issue-12-ask-your-vault`
- `lyraphasma/issue-15-encrypted-sqlite-schema`

### 3. Implement on the branch

- Follow repository architecture and security standards (see `AGENTS.md` and `.agents/rules/`).
- Verify offline behavior, zero secret-field leakage, and run tests.
- Keep commits focused and well-described.

### 4. Open a Pull Request (Do NOT merge)

Push the branch and open a PR targeting `main`:

```bash
git push -u origin lyraphasma/issue-<NUMBER>-<short-slug>
gh pr create --base main --title "feat: <Short description> (#<NUMBER>)" --body "Closes #<NUMBER>

## Summary
<Summary of changes>

## Verification
<Tests and checks performed>"
```

### 5. Report back and prompt for teammate review

When the PR is open, report:

1. GitHub Issue URL and number
2. Working branch name
3. Pull Request URL
4. Checks / tests performed
5. **Review Prompt:** Remind the developer to ask a teammate to review and approve the PR for merging.

## Repository defaults

- **Upstream repository:** `Phasmadrosophila/Verma`
- **Base branch:** `main`
- **Branch naming:** `lyraphasma/issue-<NUMBER>-<short-slug>`
- **Issue tracker:** GitHub Issues (`gh issue`)
- **PR tracker:** GitHub Pull Requests (`gh pr`)