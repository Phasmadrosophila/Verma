# Rule: Local AI Security & Redaction Boundary

This rule defines the mandatory security invariants for the Local AI Assistant in **Verma**. All agents and code implementations must adhere strictly to these constraints.

## 1. Zero Secret-Field Exposure

Redaction is **code in the trusted application layer**, never an instruction given to the model prompt.

### Forbidden Fields (Never Send to Model)
- Passwords and secret values
- TOTP seeds and 2FA tokens
- Recovery codes, recovery phrases (24-word phrases), and master vault keys
- Seed phrases and private keys
- Note bodies and secure note text
- File attachments or binary contents
- Crypto wallet entry titles, addresses, and metadata (excluded entirely from AI)

### Allowed Metadata (Only while vault is unlocked)
- Entry title (except crypto wallet entries)
- Domain or service identifier (e.g., `github.com`, `google.com`)
- Assigned tags (e.g., `work`, `infrastructure`)
- Timestamps (created, updated, last used)
- Deterministic flags (strength score, reuse flag)
- Import source and non-secret column headers
- Conflict metadata needed to explain difference

## 2. Sandbox & Network Denial

- The AI runtime (`llama.cpp`) must run in a sandboxed local environment with **no network access** (isolated socket/stdio).
- The model has **no tools** and cannot invoke filesystem, network, database, or OS operations.
- The core vault must remain fully functional when the AI assistant is disabled or when the model process is down.

## 3. Structured Outputs & No Silent Mutation

- All LLM outputs must be constrained JSON and validated against strict schemas before being rendered to the user.
- **AI as a Copilot:** The assistant suggests; the human user confirms.
- The model must NEVER directly mutate entries, resolve conflicts, delete items, or alter access controls automatically.

## 4. Vault Lock Behavior

- Locking the vault immediately revokes the AI's access to all metadata.
- No prompts, completions, cache files, or error logs may retain unredacted entry metadata or secrets.
- Logging must use event identifiers and category codes instead of user content.
