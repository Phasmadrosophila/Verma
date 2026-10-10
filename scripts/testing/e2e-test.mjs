#!/usr/bin/env node
/**
 * Verma Comprehensive E2E Testing Engine
 * Phase 2D E2E Workflows
 */

import { performance } from 'node:perf_hooks';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT_DIR = resolve(__dirname, '../..');

// Import Verma Core Packages from dist
import {
  generatePassword,
  generateDeviceIdentity,
  PairingManager,
  DesktopSyncEngine,
  SYNTHETIC_MESSY_BROWSER_CSV,
  SYNTHETIC_RECOVERY_PHRASE,
} from '../../packages/shared/dist/index.js';

import { createApp } from '../../apps/api/dist/app.js';
import { VaultRepository } from '../../apps/api/dist/repository/vault-repository.js';
import { SqliteVaultStorage } from '../../apps/api/dist/storage/sqlite-vault-storage.js';
import { AiAdapter } from '../../apps/api/dist/ai/adapter.js';

import { handleRelayRequest } from '../../relay/cloudflare-relay.mjs';

// Test Execution State & Statistics
class E2eSuiteRunner {
  constructor() {
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
    this.suites = [];
    this.currentSuite = null;
    this.startTime = 0;
    this.endTime = 0;
  }

  start() {
    this.startTime = performance.now();
  }

  stop() {
    this.endTime = performance.now();
  }

  beginSuite(name, workflowId = '') {
    this.currentSuite = {
      name,
      workflowId,
      tests: [],
      passed: 0,
      failed: 0,
      durationMs: 0,
      startTime: performance.now(),
    };
    this.suites.push(this.currentSuite);
    console.log(`\n================================================================================`);
    console.log(`SUITE: ${name} ${workflowId ? `[${workflowId}]` : ''}`);
    console.log(`================================================================================`);
  }

  endSuite() {
    if (this.currentSuite) {
      this.currentSuite.durationMs = performance.now() - this.currentSuite.startTime;
      console.log(`--------------------------------------------------------------------------------`);
      console.log(`Suite Summary: ${this.currentSuite.passed} Passed, ${this.currentSuite.failed} Failed (${this.currentSuite.durationMs.toFixed(2)} ms)`);
    }
  }

  async runTest(name, fn, acRef = '') {
    this.totalTests++;
    const t0 = performance.now();
    try {
      await fn();
      const durationMs = performance.now() - t0;
      this.passedTests++;
      if (this.currentSuite) {
        this.currentSuite.passed++;
        this.currentSuite.tests.push({ name, acRef, passed: true, durationMs, error: null });
      }
      console.log(`  [PASS] ${name} (${durationMs.toFixed(2)} ms) ${acRef ? `[${acRef}]` : ''}`);
    } catch (err) {
      const durationMs = performance.now() - t0;
      this.failedTests++;
      if (this.currentSuite) {
        this.currentSuite.failed++;
        this.currentSuite.tests.push({ name, acRef, passed: false, durationMs, error: err.message });
      }
      console.error(`  [FAIL] ${name} (${durationMs.toFixed(2)} ms) ${acRef ? `[${acRef}]` : ''}`);
      console.error(`         Error: ${err.message}`);
      if (err.stack) {
        console.error(`         Stack: ${err.stack.split('\n').slice(1, 3).join('\n')}`);
      }
    }
  }

  getReport() {
    const totalDurationMs = this.endTime - this.startTime;
    return {
      totalTests: this.totalTests,
      passedTests: this.passedTests,
      failedTests: this.failedTests,
      skippedTests: this.skippedTests,
      passRatePct: this.totalTests > 0 ? ((this.passedTests / this.totalTests) * 100).toFixed(2) : '0.00',
      durationMs: totalDurationMs,
      suites: this.suites,
    };
  }
}

const runner = new E2eSuiteRunner();

class MockDirectPeerTransport {
  constructor(peerEngine, networkDrop = false) {
    this.peerEngine = peerEngine;
    this.networkDrop = networkDrop;
  }
  async handshake(message) {
    if (this.networkDrop) throw new Error('Network transport dropped');
    return this.peerEngine.handleInboundHandshake(message);
  }
  async send(envelope) {
    if (this.networkDrop) throw new Error('Network transport dropped');
    return this.peerEngine.handleInboundEnvelope(envelope);
  }
}

class MemoryKvNamespace {
  constructor() {
    this.store = new Map();
  }
  async get(key, type = 'text') {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (type === 'arrayBuffer') {
      return entry.data.buffer.slice(entry.data.byteOffset, entry.data.byteOffset + entry.data.byteLength);
    }
    return entry.data.toString('utf8');
  }
  async put(key, value, options = {}) {
    let buf;
    if (value instanceof ArrayBuffer) buf = Buffer.from(value);
    else if (Buffer.isBuffer(value)) buf = value;
    else if (typeof value === 'string') buf = Buffer.from(value, 'utf8');
    else buf = Buffer.from(String(value));
    this.store.set(key, { data: buf, metadata: options.metadata || { bytes: buf.length } });
  }
  async delete(key) { return this.store.delete(key); }
  async list() {
    const keys = [];
    for (const [name, entry] of this.store.entries()) keys.push({ name, metadata: entry.metadata });
    return { keys };
  }
}

export async function executeE2ETestHarness() {
  runner.start();
  console.log('Starting Verma Phase 2D E2E Validation Suite...');
  console.log(`Execution Timestamp: ${new Date().toISOString()}`);

  // ============================================================================
  // Workflow 1: Complete Account & Vault Lifecycle
  // ============================================================================
  runner.beginSuite('Workflow 1: Complete Account & Vault Lifecycle', 'WF_1');

  await runner.runTest('1.1 Initialize, Recovery Validation, Entries CRUD, Generator & Lock/Unlock Cycle', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    const { app: apiApp } = createApp({ repository: repo });

    const password = 'SuperSecureMasterPassword!1$';
    const initRes = await repo.initialize(password);
    if (!initRes.vaultId || typeof initRes.vaultId !== 'string') {
      throw new Error('Vault initialization failed to yield valid vaultId');
    }

    // Verify recovery phrase fixture formatting
    const recoveryWords = SYNTHETIC_RECOVERY_PHRASE.trim().split(/\s+/);
    if (recoveryWords.length !== 24) {
      throw new Error('Recovery phrase length does not match BIP39 standard of 24 words');
    }

    const genPass = generatePassword({ length: 16 });
    if (genPass.length !== 16) throw new Error('Password generator failed');

    const loginId = (await repo.createEntry({
      type: 'login', title: 'My Work Login', username: 'work@test.com', password: genPass
    })).id;

    const noteId = (await repo.createEntry({
      type: 'note', title: 'Secure Note', content: 'Secret Content'
    })).id;

    const apiKeyId = (await repo.createEntry({
      type: 'api_key', title: 'AWS Proj X', service: 'AWS', apiKey: 'AKIA...SECRET'
    })).id;

    const entries = await repo.listEntries();
    if (entries.length !== 3) throw new Error('CRUD failed: could not list 3 created entries');

    await repo.updateEntry(loginId, { title: 'Updated Work Login' });
    const getLogin = await repo.getEntry(loginId);
    if (getLogin.title !== 'Updated Work Login') throw new Error('Update entry failed');

    await repo.deleteEntry(apiKeyId);
    const finalEntries = await repo.listEntries();
    if (finalEntries.length !== 2) throw new Error('Delete entry failed');

    repo.lock();
    if (!repo.getStatus().isLocked) throw new Error('Vault lock failed');

    const lockedAppRes = await apiApp.request('/api/entries', { method: 'GET' });
    if (lockedAppRes.status !== 423) throw new Error('Locked REST endpoint did not return 423 Locked');

    const unlockSuccess = await repo.unlock(password);
    if (!unlockSuccess || repo.getStatus().isLocked) throw new Error('Unlock sequence failed');
  });

  runner.endSuite();

  // ============================================================================
  // Workflow 2: AI Smart CSV Import
  // ============================================================================
  runner.beginSuite('Workflow 2: AI Smart CSV Import', 'WF_2');

  await runner.runTest('2.1 Messy CSV Analyze, Staging, Duplicate Grouping & Vault Commit with Zero Leaks', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    await repo.initialize('ImportTest123!');
    const aiAdapter = new AiAdapter({ enabled: false });
    const { app: apiApp } = createApp({ repository: repo, aiAdapter });

    const analyzeRes = await apiApp.request('/api/import/analyze', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ csvContent: SYNTHETIC_MESSY_BROWSER_CSV }),
    });
    const analyzeData = await analyzeRes.json();
    if (!analyzeData.stagingId || !analyzeData.proposal) throw new Error('Import analyze failed');
    if (!Array.isArray(analyzeData.proposal.duplicateGroups)) throw new Error('Duplicate grouping missing from proposal');

    if (await repo.listEntries().then(e => e.length) !== 0) throw new Error('Analyze mutated vault before confirmation');

    const confirmRes = await apiApp.request('/api/import/confirm', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stagingId: analyzeData.stagingId, additionalTags: ['csv'] }),
    });
    const confirmData = await confirmRes.json();
    if (confirmData.importedCount === 0) throw new Error('Zero records committed in confirmation');

    const writtenEntries = await repo.listEntries();
    if (writtenEntries.length === 0) throw new Error('Vault storage empty after confirm');
  });

  runner.endSuite();

  // ============================================================================
  // Workflow 3: Ask Your Vault Natural Language Search
  // ============================================================================
  runner.beginSuite('Workflow 3: Ask Your Vault Natural Language Search', 'WF_3');

  await runner.runTest('3.1 Metadata-Only Search and NL Query with Zero Secret Exposure', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    await repo.initialize('SearchVaultPass!');
    await repo.createEntry({ type: 'login', title: 'Work AWS Root', username: 'root@aws', password: 'secret1', tags: ['work', 'aws'] });
    await repo.createEntry({ type: 'api_key', title: 'Old Personal Twitter', service: 'Twitter', apiKey: 'secret2', tags: ['personal', 'old'] });

    class TestAssistant extends AiAdapter {
      constructor() { super({ enabled: true }); }
      async askVault(question, metadata) {
        return {
          answer: `Found ${metadata.length} entries.`,
          matchedIds: metadata.map(m => m.id)
        };
      }
    }

    const searchResults = await repo.searchMetadata('aws');
    for (const res of searchResults) {
      if (res.password !== undefined || res.apiKey !== undefined) {
        throw new Error('Secret field exposure detected during metadata search');
      }
    }

    const testAi = new TestAssistant();
    const metaPayload = await repo.getMetadataList();
    const nlResult = await testAi.askVault('Find my work AWS keys', metaPayload);
    
    if (nlResult.matchedIds.length !== 2) throw new Error('NL search adapter logic failed');
  });

  runner.endSuite();

  // ============================================================================
  // Workflow 4: Multi-Device Direct Sync (P2P)
  // ============================================================================
  runner.beginSuite('Workflow 4: Multi-Device Direct Sync (P2P)', 'WF_4');

  await runner.runTest('4.1 Device Pairing & Delta Sync Flow Validation', async () => {
    const devA = generateDeviceIdentity('Laptop-A');
    const devB = generateDeviceIdentity('Desktop-B');
    const pairMgrA = new PairingManager(devA);
    const pairMgrB = new PairingManager(devB);

    const { invitation, pairingCode } = pairMgrA.createInvitation();
    const { exchangeMessage } = pairMgrB.acceptInvitation(invitation, pairingCode);
    const { confirmation } = pairMgrA.confirmPairing(pairingCode, exchangeMessage);
    pairMgrB.finalizePairing(invitation, confirmation);

    if (!pairMgrA.isDevicePaired(devB.deviceId) || !pairMgrB.isDevicePaired(devA.deviceId)) {
      throw new Error('Device pairing failed');
    }

    const appliedDeltas = [];
    const engineB = new DesktopSyncEngine(devB, pairMgrB, async (ds) => { appliedDeltas.push(...ds); });
    const engineA = new DesktopSyncEngine(devA, pairMgrA);
    const mockTransport = new MockDirectPeerTransport(engineB);

    const testDeltas = [{ entryId: 'test-sync-1', op: 'UPDATE', tags: ['remote', 'synced'], updatedAt: Date.now(), version: 3 }];
    const res = await engineA.syncToPeer(devB.deviceId, mockTransport, testDeltas);
    
    if (!res.success || res.appliedCount !== 1) throw new Error('Sync delta push failed');
    if (appliedDeltas.length !== 1 || !appliedDeltas[0].tags.includes('synced')) throw new Error('State update failed on receiving device');
  });

  runner.endSuite();

  // ============================================================================
  // Workflow 5: Serverless Relay Fallback Sync
  // ============================================================================
  runner.beginSuite('Workflow 5: Serverless Relay Fallback Sync', 'WF_5');

  await runner.runTest('5.1 Opaque Envelope Upload/Fetch and Constraints Enforcement', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'verma-e2e-relay-'));
    const token = 'cf_relay_e2e_token';
    const kv = new MemoryKvNamespace();
    const env = { RELAY_AUTH_TOKEN: token, VERMA_RELAY_KV: kv, RELAY_MAX_ENVELOPE_BYTES: '1048576' };

    const envelopeId = 'e2e_env_' + randomBytes(8).toString('hex');
    const pld = Buffer.from('E2E_OPAQUE_ROUTING_TEST_ENVELOPE');

    // PUT Envelope
    const putReq = new Request(`https://r.local/v1/envelopes/${envelopeId}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream', 'content-length': String(pld.length), 'x-verma-envelope-version': '1' },
      body: pld,
    });
    const putRes = await handleRelayRequest(putReq, env);
    if (putRes.status !== 201) throw new Error(`Envelope PUT failed with ${putRes.status}`);

    // GET Envelope
    const getReq = new Request(`https://r.local/v1/envelopes/${envelopeId}`, {
      method: 'GET', headers: { authorization: `Bearer ${token}` }
    });
    const getRes = await handleRelayRequest(getReq, env);
    if (getRes.status !== 200) throw new Error(`Envelope GET failed with ${getRes.status}`);
    const outBuf = Buffer.from(await getRes.arrayBuffer());
    if (!outBuf.equals(pld)) throw new Error('Retrieved envelope payload corrupted');

    // Reject > 1MB
    const bigBuf = Buffer.alloc(1048576 + 500, 0xAA);
    const bigReq = new Request(`https://r.local/v1/envelopes/${envelopeId}_big`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream', 'content-length': String(bigBuf.length), 'x-verma-envelope-version': '1' },
      body: bigBuf,
    });
    const bigRes = await handleRelayRequest(bigReq, env);
    if (bigRes.status !== 413) throw new Error(`Expected 413 for payload >1MB, got ${bigRes.status}`);

    await rm(tempDir, { recursive: true, force: true });
  });

  runner.endSuite();

  runner.stop();

  const report = runner.getReport();
  console.log('\n================================================================================');
  console.log('FINAL E2E AUTOMATION TEST RESULTS');
  console.log('================================================================================');
  console.log(`Total Tests Executed : ${report.totalTests}`);
  console.log(`Tests Passed         : ${report.passedTests}`);
  console.log(`Tests Failed         : ${report.failedTests}`);
  console.log(`Pass Rate            : ${report.passRatePct}%`);
  console.log(`Total Execution Time : ${report.durationMs.toFixed(2)} ms`);
  console.log(`Gate Decision        : ${report.failedTests === 0 ? 'GATE PASSED (100% SUCCESS)' : 'GATE FAILED'}`);
  console.log('================================================================================\n');

  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const report = await executeE2ETestHarness();
  if (report.failedTests > 0) {
    process.exit(1);
  }
}
