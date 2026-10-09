# Development Guide

Welcome to Verma's developer documentation.

## Setup and Architecture

- [Local Development Setup](./setup.md): Instructions for installing dependencies, starting the API, and running the frontend.
- [Testing Guide](./testing.md): Overview of unit, integration, and E2E testing commands.
- [Contributing Rules](./contributing.md): The mandatory Git and GitHub workflow for submitting features and pull requests.

## Monorepo Structure

Verma uses `pnpm` workspaces:

- `apps/api`: Hono backend service, database interactions, AI runtime adapter.
- `apps/web`: React SPA frontend.
- `apps/mobile`: (Roadmap) Mobile client built with Expo.
- `apps/mobile-preview`: Expo web preview.
- `packages/shared`: TypeScript interfaces, schemas, and shared utilities (e.g., `SafeLogger`).

## Adding a Feature

1. Ensure a GitHub Issue exists with the canonical task template.
2. Follow the [Contributing Rules](./contributing.md) to create an `issue-<NUMBER>` branch.
3. Add backend logic to `apps/api` (updating models, routes, and `VaultRepository` if necessary).
4. Update frontend components in `apps/web/src`.
5. Write corresponding tests for the API and UI boundaries.
6. Open a draft Pull Request, fill the PR template, and verify CI tests pass.
