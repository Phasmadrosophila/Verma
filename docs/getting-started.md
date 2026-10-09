# Getting Started

This guide explains how to set up the Verma repository for local development.

## Prerequisites

- **Node.js**: Version 22.0.0 or higher.
- **Package Manager**: pnpm (v12.8.1 recommended). Enable it via `corepack enable pnpm`.
- **Docker**: For running containerized services and relay tests.
- **Git**: For source control.

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Phasmadrosophila/Verma.git
   cd Verma
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   *Note: Never commit your `.env` file or include real secrets.*

## Local Development

The project is structured as a monorepo containing multiple apps (`@app/api`, `@app/web`, etc.).

1. **Start the API Server**:
   ```bash
   pnpm dev
   ```
   The backend API will typically start on `http://localhost:3000`.

2. **Start the Frontend Web App**:
   ```bash
   pnpm dev:web
   ```
   The Vite development server will open the web interface (usually on `http://localhost:5173`).

## Available Scripts

From the repository root, you can run:

- `pnpm build`: Builds all workspace packages.
- `pnpm test`: Runs the test suite across all packages.
- `pnpm check`: Runs TypeScript type checking without emitting files.
- `pnpm lint`: Runs `oxlint` across packages.

## Database Initialization

Verma uses an encrypted local SQLite database. The schema is defined programmatically and created automatically by the backend upon vault initialization (`/api/vault/init`). No separate migration script is necessary for local development setup.

## Next Steps

- Review the [Development Guide](./development/README.md) for contribution rules.
- Check the [API Reference](./api/README.md) for available endpoints.
