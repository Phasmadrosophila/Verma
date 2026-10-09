# Pull-request CI

`Pull Request CI` (`.github/workflows/pull-request-ci.yml`) runs only for pull requests targeting `main`. It has read-only repository permissions (`contents: read`), disables persisted checkout credentials, does not reference secrets, cancels superseded runs via a concurrency group, and gives each job a finite timeout.

The Node/pnpm jobs run on `ubuntu-latest` with Node 22, enable pnpm through Corepack (`corepack enable pnpm`), and install the tracked lockfile with `pnpm install --frozen-lockfile` before running checks.

| Job | CI command(s) | Purpose |
| --- | --- | --- |
| Typecheck | `pnpm run check` | Workspace-wide typecheck. |
| Lint | `pnpm run check`, `pnpm --filter @app/web run lint`, `node --check scripts/verify.ts` | Typecheck plus the web-package lint and a syntax check of the verification script. |
| Test | `pnpm run check:verification`, `pnpm run test:offline`, `pnpm run test:redaction`, `pnpm run test:sync`, `pnpm run test:privacy`, `pnpm run test:rehearsal`, `pnpm --filter @app/shared test -- --test-name-pattern=Dead` | Verification check followed by the offline, redaction, sync, privacy, rehearsal, and Dead Man's Switch test suites. |
| Docker smoke | `docker build --tag verma-ci:${{ github.sha }} .` | Reproducible production-image build. |
| Model manifest | `./scripts/ci/check-model-manifest.ps1`, `./tests/ci/model-manifest.tests.ps1` | Verifies declared model-manifest metadata (version, SHA-256, license). Downloads no artifacts; only checks metadata when `models/manifest.json` exists. |
| Workflow safety | `./scripts/ci/check-workflow-safety.ps1 -WorkflowPath .github/workflows/pull-request-ci.yml -RequireCiJobs`, `./tests/ci/workflow-safety.tests.ps1`, `./tests/ci/ci-baseline.tests.ps1` | Guards the workflow's safety properties (read-only permissions, no persisted credentials, required jobs present). |

TODO(verify): The `workflow-safety` job's third step, `./tests/ci/ci-baseline.tests.ps1`, still asserts the pre-pnpm CI layout (bare `node --check relay/server.mjs`) and throws when it finds `pnpm` in the workflow. Because CI migrated to the pnpm workflow documented above, that baseline check is currently inconsistent with the real workflow. Treat the `workflow-safety` job as a known issue until the baseline test is reconciled; do not assume this workflow currently passes end to end.
