# Pull-request CI

`Pull Request CI` runs only for pull requests targeting `main`. It has read-only repository permissions, disables persisted checkout credentials, does not reference secrets, cancels superseded runs, and gives each job a finite timeout.

| Check | CI command | Purpose |
| --- | --- | --- |
| Typecheck | `node --check relay/server.mjs` | JavaScript syntax validation for the relay source; this baseline has no TypeScript sources. |
| Lint | `node --check relay/server.mjs` plus `node --check tests/relay/*.test.mjs` | Dependency-free syntax lint for the tracked JavaScript source and tests. |
| Test | `node --test tests/relay/*.test.mjs` | Automated relay deployment and opaque-envelope test suite. |
| Docker smoke | `docker build --tag verma-ci:local .` | Reproducible production-image build |
| Model manifest | `pwsh ./scripts/ci/check-model-manifest.ps1` | Verifies version, SHA-256, and license fields when a model manifest is added |

The repository intentionally has no root Node package manifest or lockfile yet, so these baseline jobs do not run `pnpm install` or download application dependencies. Run `pwsh ./scripts/ci/check-workflow-safety.ps1 -WorkflowPath .github/workflows/pull-request-ci.yml -RequireCiJobs`, `pwsh ./tests/ci/workflow-safety.tests.ps1`, and `pwsh ./tests/ci/ci-baseline.tests.ps1` to verify AC-A-M0-04-01 and AC-A-M0-04-05. The model-manifest check intentionally downloads no artifacts; it only verifies declared metadata when `models/manifest.json` exists.
