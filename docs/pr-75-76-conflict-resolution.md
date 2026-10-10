# PR #75 and #76 integration with main

Both design branches had the same nine mobile/API conflicts with main. The
resolution keeps main's API client, metadata-only list, explicit secret fetch,
error handling, safe-area provider, and edit-secret loading. The redesigned
navigation, welcome/setup screens, preview styles, and landing assets remain.
The Ask screen answer panel and Devices health check use the retained client.
Main's application lifecycle remains authoritative; the setup screen design
is not evidence of a completed backend account/recovery workflow.

The lockfile inherited committed conflict markers from main. These were
resolved against its current dependency versions and repaired with pnpm.

Verification on the shared resolution:
- Frozen dependency install passes.
- Workspace check passes (shared, API, mobile, web, preview).
- Web lint passes.
- Mobile unit tests: 13 pass, including health success/HTTP/transport failure.
- Preview unit tests: 5 pass; preview syntax checks pass.
- Redaction boundary tests: 5 pass.
- Download and landing footer checks pass.
- No conflict markers remain in apps or pnpm-lock.yaml.

This is conflict/integration validation, not a complete security or visual
acceptance review. Native-device, browser visual, and full E2E validation were
not run. Existing PR description placeholders still need task traceability,
acceptance evidence, and teammate review before human merge.
