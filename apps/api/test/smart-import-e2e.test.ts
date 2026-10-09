import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { VaultRepository } from '../src/repository/vault-repository.js';
import { AiAdapter } from '../src/ai/adapter.js';
import {
  SYNTHETIC_MESSY_BROWSER_CSV,
  SYNTHETIC_CLEAN_BROWSER_CSV,
} from '@app/shared';

describe('Smart Import Preview & Confirmation Integration (B-M1-03)', () => {
  let app: any;
  let repo: VaultRepository;
  const masterPassword = 'MasterPassword2026!Test';

  beforeEach(async () => {
    repo = new VaultRepository();
    await repo.initialize(masterPassword);
    const created = createApp({ repository: repo });
    app = created.app;
  });

  test('AC-B-M1-03-01: fixture import integration test with network disabled', async () => {
    // Adapter runs with network disabled / local offline fallback
    const offlineAdapter = new AiAdapter({
      enabled: false,
      apiUrl: 'http://127.0.0.1:11434',
      model: 'TBD',
      timeoutMs: 1000,
    });
    const { app: offlineApp } = createApp({ repository: repo, aiAdapter: offlineAdapter });

    // Send synthetic messy browser CSV to /api/import/analyze
    const res = await offlineApp.request('/api/import/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent: SYNTHETIC_MESSY_BROWSER_CSV }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();

    assert.ok(body.stagingId);
    assert.ok(body.proposal);
    assert.equal(body.proposal.sourceType, 'browser_csv');
    assert.equal(body.proposal.totalRows, 6);
    assert.equal(body.proposal.previewRows.length, 6);

    // Verify mappings
    const mappings = body.proposal.mappings;
    assert.ok(mappings.some((m: any) => m.sourceColumn === 'name' && m.targetField === 'title'));
    assert.ok(mappings.some((m: any) => m.sourceColumn === 'password' && m.targetField === 'password'));
    assert.ok(mappings.some((m: any) => m.sourceColumn === 'url' && m.targetField === 'url'));
  });

  test('AC-B-M1-03-02: preview versus commit state test', async () => {
    // 1. Initially vault should have 0 entries
    const initialEntries = await repo.listEntries();
    assert.equal(initialEntries.length, 0);

    // 2. Run analysis to create preview proposal
    const analyzeRes = await app.request('/api/import/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent: SYNTHETIC_MESSY_BROWSER_CSV }),
    });
    assert.equal(analyzeRes.status, 200);
    const analyzeData = await analyzeRes.json();
    const stagingId = analyzeData.stagingId;

    // 3. Invariant: preview rows exist in proposal, but applied vault data is strictly 0!
    const entriesDuringPreview = await repo.listEntries();
    assert.equal(entriesDuringPreview.length, 0);
    assert.equal(analyzeData.proposal.previewRows.length, 6);

    // 4. Preview separates mappings, tags, and staged entries cleanly
    assert.ok(Array.isArray(analyzeData.proposal.mappings));
    assert.ok(Array.isArray(analyzeData.proposal.suggestedTags));
    assert.ok(Array.isArray(analyzeData.proposal.previewRows));

    // 5. Explicit user confirmation commits the records
    const confirmRes = await app.request('/api/import/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stagingId }),
    });
    assert.equal(confirmRes.status, 200);
    const confirmData = await confirmRes.json();
    assert.equal(confirmData.importedCount, 6);
    assert.equal(confirmData.failedCount, 0);

    // 6. Now the vault contains the applied entries
    const entriesAfterCommit = await repo.listEntries();
    assert.equal(entriesAfterCommit.length, 6);
  });

  test('AC-B-M1-03-03: duplicate-group fixture test', async () => {
    const res = await app.request('/api/import/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent: SYNTHETIC_MESSY_BROWSER_CSV }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();

    // Verify duplicate groups are detected and visible
    const duplicateGroups = data.proposal.duplicateGroups;
    assert.ok(duplicateGroups.length >= 1);

    // Finding GitHub duplicate group (rows 0 and 4 share domain and username)
    const githubGroup = duplicateGroups.find((g: any) => g.key.includes('github.com'));
    assert.ok(githubGroup);
    assert.ok(githubGroup.candidates.length >= 2);
    assert.match(githubGroup.reason, /github\.com/);

    // Verify mapping confidence is visible for every column
    for (const mapping of data.proposal.mappings) {
      assert.ok(['high', 'medium', 'low'].includes(mapping.confidence));
      assert.ok(['ai', 'heuristic'].includes(mapping.suggestedBy));
    }
  });

  test('AC-B-M1-03-04: outbound-request denial test', async () => {
    // Configured with external cloud endpoint
    const cloudAdapter = new AiAdapter({
      enabled: true,
      apiUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      timeoutMs: 1000,
    });
    const { app: cloudApp } = createApp({ repository: repo, aiAdapter: cloudAdapter });

    const res = await cloudApp.request('/api/import/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent: SYNTHETIC_MESSY_BROWSER_CSV }),
    });

    // Enforces outbound request denial: 403 Forbidden
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /AI Adapter network denial: only local endpoints are permitted/);
  });

  test('AC-B-M1-03-05: cancel-without-write test', async () => {
    // 1. Analyze import
    const analyzeRes = await app.request('/api/import/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent: SYNTHETIC_CLEAN_BROWSER_CSV }),
    });
    assert.equal(analyzeRes.status, 200);
    const { stagingId } = await analyzeRes.json();

    // 2. User decides to cancel
    const cancelRes = await app.request('/api/import/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stagingId }),
    });
    assert.equal(cancelRes.status, 200);

    // 3. Vault records remain 0 - zero data was written!
    const entries = await repo.listEntries();
    assert.equal(entries.length, 0);

    // 4. Confirming with cancelled stagingId fails
    const invalidConfirmRes = await app.request('/api/import/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stagingId }),
    });
    assert.equal(invalidConfirmRes.status, 400);
  });

  test('Edge Case: locked vault rejects import analysis', async () => {
    repo.lock();

    const res = await app.request('/api/import/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent: SYNTHETIC_CLEAN_BROWSER_CSV }),
    });

    assert.equal(res.status, 423); // Locked
  });
});
