import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { VaultRepository } from '../src/repository/vault-repository.js';
import { SqliteVaultStorage } from '../src/storage/sqlite-vault-storage.js';

describe('Hono API Routes Integration', () => {
  let app: ReturnType<typeof createApp>['app'];
  let repo: VaultRepository;
  const masterPassword = 'ApiRouteTestPassword2026!';

  beforeEach(() => {
    const storage = new SqliteVaultStorage(':memory:');
    repo = new VaultRepository(storage);
    const appInstance = createApp({ repository: repo });
    app = appInstance.app;
  });

  it('GET /health should return 200 ok', async () => {
    const res = await app.request('/health');
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.status, 'ok');
    assert.equal(json.service, 'verma-api');
  });

  it('GET /api/vault/status should return uninitialized status initially', async () => {
    const res = await app.request('/api/vault/status');
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.status, 'uninitialized');
    assert.equal(json.isLocked, true);
    assert.equal(json.isInitialized, false);
  });

  it('POST /api/vault/init should initialize the vault', async () => {
    const res = await app.request('/api/vault/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: masterPassword }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.vaultId);

    const statusRes = await app.request('/api/vault/status');
    const statusJson = await statusRes.json();
    assert.equal(statusJson.status, 'unlocked');
  });

  it('should support complete CRUD cycle over /api/entries and /api/metadata', async () => {
    // 1. Initialize
    await app.request('/api/vault/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: masterPassword }),
    });

    // 2. Create entry
    const createRes = await app.request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'login',
        title: 'GitLab Corporate',
        username: 'dev@corp.test',
        password: 'SecretGitLabPass123!',
        url: 'https://gitlab.corp.test',
        domain: 'gitlab.corp.test',
        tags: ['git', 'corp'],
      }),
    });

    assert.equal(createRes.status, 201);
    const createJson = await createRes.json();
    const entryId = createJson.entry.id;
    assert.ok(entryId);

    // 3. List entries
    const listRes = await app.request('/api/entries');
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.equal(listJson.entries.length, 1);

    // 4. Get metadata (assert password is NOT present)
    const metaRes = await app.request('/api/metadata');
    assert.equal(metaRes.status, 200);
    const metaJson = await metaRes.json();
    assert.equal(metaJson.metadata.length, 1);
    assert.equal(metaJson.metadata[0].title, 'GitLab Corporate');
    assert.equal(metaJson.metadata[0].password, undefined);

    // 5. Search metadata
    const searchRes = await app.request('/api/metadata/search?q=Corporate');
    assert.equal(searchRes.status, 200);
    const searchJson = await searchRes.json();
    assert.equal(searchJson.metadata.length, 1);

    // 6. Lock vault
    const lockRes = await app.request('/api/vault/lock', { method: 'POST' });
    assert.equal(lockRes.status, 200);

    // 7. Reading entries while locked returns 423
    const lockedEntriesRes = await app.request('/api/entries');
    assert.equal(lockedEntriesRes.status, 423);

    // 8. Reading metadata while locked returns 423
    const lockedMetaRes = await app.request('/api/metadata');
    assert.equal(lockedMetaRes.status, 423);

    // 9. Unlock vault with wrong password returns 401
    const wrongUnlockRes = await app.request('/api/vault/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'WrongPassword' }),
    });
    assert.equal(wrongUnlockRes.status, 401);

    // 10. Unlock vault with correct password returns 200
    const correctUnlockRes = await app.request('/api/vault/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: masterPassword }),
    });
    assert.equal(correctUnlockRes.status, 200);

    // 11. Reading entries unlocked again
    const unlockedRes = await app.request('/api/entries');
    assert.equal(unlockedRes.status, 200);
  });

  it('should seed and scan fixtures via /api/fixtures', async () => {
    // Initialize
    await app.request('/api/vault/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: masterPassword }),
    });

    // Scan
    const scanRes = await app.request('/api/fixtures/scan');
    assert.equal(scanRes.status, 200);
    const scanJson = await scanRes.json();
    assert.equal(scanJson.passed, true);

    // Seed
    const seedRes = await app.request('/api/fixtures/seed', { method: 'POST' });
    assert.equal(seedRes.status, 200);
    const seedJson = await seedRes.json();
    assert.equal(seedJson.success, true);
    assert.ok(seedJson.seededCount >= 10);
  });

  it('E-MR-03 / AC-E-MR-03-04: Ask Your Vault searches redacted metadata', async () => {
    await app.request('/api/vault/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: masterPassword }),
    });

    await app.request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'login',
        title: 'Synthetic Work Account',
        username: 'demo@example.test',
        password: 'SyntheticOnlySecret!',
        domain: 'example.test',
        tags: ['work'],
      }),
    });

    const response = await app.request('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Which work account uses example.test?' }),
    });

    assert.equal(response.status, 200);
    const result = await response.json();
    assert.match(result.answer, /fallback|unavailable|disabled/i);
    assert.deepEqual(result.relevantEntryIds, []);
  });
});
