# Testing

Verma uses the native Node.js test runner (`node:test`) for all tests.

## Running Tests

From the repository root:

- **All tests**: 
  ```bash
  pnpm test
  ```
- **Offline / AI Fallback Verification**:
  ```bash
  pnpm run test:offline
  ```
- **Redaction Boundary**:
  ```bash
  pnpm run test:redaction
  ```
- **Direct Sync Validation**:
  ```bash
  pnpm run test:sync
  ```
- **Privacy Scanner** (Ensures logs do not leak secrets):
  ```bash
  pnpm run test:privacy
  ```
- **Integration Tests**:
  ```bash
  pnpm run test:integration
  ```

## UI Testing

Frontend tests are located in `apps/web/test/`. They use `node:test` and `react-dom/server` to render components to static markup and perform assertions on the resulting HTML strings.

Example to run frontend tests only:
```bash
pnpm --filter @app/web test
```

## API Testing

API tests are located in `apps/api/test/`. They instantiate the `Hono` app and use `app.request()` to simulate HTTP requests against the local router.

Example to run backend tests only:
```bash
pnpm --filter @app/api test
```

## Static Analysis

Before opening a PR, ensure all static checks pass:
```bash
pnpm check  # TypeScript type checking
pnpm lint   # oxlint
```
