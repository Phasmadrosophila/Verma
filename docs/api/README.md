# API Reference

The Verma Backend exposes REST endpoints using the Hono framework. The API is designed for local consumption by the frontend SPA.

## General Information

- **Base URL**: `/api`
- **Content-Type**: `application/json`

## Vault Lifecycle Endpoints

### `GET /api/vault/status`
Retrieves the current status of the vault.
- **Response**:
  ```json
  {
    "status": "locked" | "unlocked" | "uninitialized",
    "isLocked": boolean,
    "isInitialized": boolean
  }
  ```

### `POST /api/vault/init`
Initializes a new vault.
- **Payload**: `{ "password": "master-password" }`
- **Response**: `{ "success": true }`

### `POST /api/vault/unlock`
Unlocks the vault and caches the encryption key in memory.
- **Payload**: `{ "password": "master-password" }`
- **Response**: `{ "success": true }`

### `POST /api/vault/lock`
Locks the vault, clearing the key from memory.
- **Response**: `{ "success": true }`

## Entry Management

### `GET /api/entries/:id`
Fetch a decrypted entry (vault must be unlocked).

### `POST /api/entries`
Create a new entry.
- **Payload**: `CreateEntryInput` (varies by type: `login`, `note`, `api_key`).
- **Response**: The created `VaultEntry`.

### `PUT /api/entries/:id`
Update an existing entry.

### `DELETE /api/entries/:id`
Delete an entry.

## AI and Metadata

### `GET /api/metadata/search`
Search over redacted metadata. Supports plain-text queries.
- **Query Parameter**: `q=search_term`
- **Response**: `{ "metadata": [RedactedEntryMetadata] }`

### `POST /api/ask`
Natural language query against the vault using the Local AI Assistant.
- **Payload**: `{ "query": "What are my banking logins?" }`
- **Response**: 
  ```json
  {
    "answer": "You have...",
    "relevantEntryIds": ["id1", "id2"]
  }
  ```

### `POST /api/import/analyze`
Analyze CSV import contents and propose metadata mappings and deduplication using AI.

### `POST /api/import/confirm`
Confirm an AI-suggested import payload and execute the mutations.

## Error Handling

Failed requests return a consistent JSON error structure:
```json
{
  "error": "Human readable error message"
}
```
HTTP status codes reflect the failure type (e.g., 400 Validation Error, 403 Locked, 404 Not Found, 500 Server Error).
