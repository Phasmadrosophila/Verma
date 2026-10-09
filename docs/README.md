# Verma Documentation

Welcome to the documentation for **Verma**, an offline, local-first digital secrets manager for passwords, API keys, and account logins with an on-device Local AI Assistant and serverless direct device-to-device synchronization.

## Documentation Navigation

### [Getting Started](./getting-started.md)
Instructions for setting up the environment, installing dependencies, and running the application locally.

### [Features](./features/README.md)
Detailed documentation on application features including vault lifecycle, entry management, and AI workflows (e.g., Ask Your Vault, Smart Import).

### [Architecture](./architecture/overview.md)
High-level system overview, technical architecture, and design decisions. This section also includes documentation on the design system, offline runtime, and direct sync capabilities.

### [API Reference](./api/README.md)
Details on the available backend endpoints, request/response formats, and authentication boundaries.

### [Database & Data Model](./database/README.md)
Schema definitions, entity relationships, encryption-at-rest strategies, and data lifecycle management using SQLite and `libsodium`.

### [Security](./security/README.md)
Implemented security mechanisms, threat mitigations, redaction boundaries, and zero secret-field exposure invariants.

### [Development Guide](./development/README.md)
Instructions for local development setup, testing, and contribution workflows (including GitHub issues and PR guidelines).

### [Deployment](./deployment/README.md)
Documentation on CI/CD pipelines, self-hosted deployment using Docker, and operational considerations.

---

For project planning, hackathon objectives, and the product requirements document, see the legacy documents:
- [Product Requirements Document (PRD)](./prd.md)
- [Competition Handbook](./COMPETITION-HANDBOOK.md)
- [Workplan](./workplan.md)
