import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = resolve(fileURLToPath(import.meta.url), '../../../..');
const RELAY_SCRIPT_PATH = join(ROOT_DIR, 'relay/server.mjs');

import {
  deriveMasterKey,
  generateSalt,
  encryptJson,
  decryptJson,
  zeroizeBuffer,
  generateDeviceIdentity,
  PairingManager,
  createSyncEnvelope,
  unpackSyncEnvelope,
  type SyncDelta,
} from '@app/shared';

import { createApp } from '../src/app.js';
import { VaultRepository } from '../src/repository/vault-repository.js';
import { SqliteVaultStorage } from '../src/storage/sqlite-vault-storage.js';

describe('Phase 2B: Comprehensive Stress Testing and System Stability Gates', () => {
  const masterPassword = 'Phase2BStressTestingPassword2026!#$';

  describe('Suite 1: High Concurrency Vault Entry CRUD Operations', () => {
    it('should handle 100+ concurrent writes, 500+ concurrent reads, updates, and deletes with 0% data corruption', async () => {
      const storage = new SqliteVaultStorage(':memory:');
      const repo = new VaultRepository(storage);
      await repo.initialize(masterPassword);
      const { app } = createApp({ repository: repo });

      const WRITE_COUNT = 120;
      const READ_COUNT = 500;
      const UPDATE_COUNT = 80;
      const DELETE_COUNT = 40;

      // 1. High Concurrency Writes (120 parallel writes)
      const createdEntries: { id: string; title: string; type: string }[] = [];
      const writeLatencies: number[] = [];

      const writePromises = Array.from({ length: WRITE_COUNT }, async (_, i) => {
        const type = i % 3 === 0 ? 'login' : i % 3 === 1 ? 'api_key' : 'note';
        const title = `Concurrent Entry ${i} - ${randomUUID().slice(0, 8)}`;
        let body: any;

        if (type === 'login') {
          body = { type, title, username: `user_${i}`, password: `pass_${i}_${randomBytes(8).toString('hex')}` };
        } else if (type === 'api_key') {
          body = { type, title, service: `svc_${i}`, apiKey: `key_${randomBytes(16).toString('hex')}` };
        } else {
          body = { type, title, content: `Encrypted note body ${i}` };
        }

        const t0 = performance.now();
        const res = await app.request('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        writeLatencies.push(performance.now() - t0);

        assert.equal(res.status, 201, `Write failed for entry ${i}`);
        const json = await res.json();
        createdEntries.push({ id: json.entry.id, title, type });
      });

      await Promise.all(writePromises);
      assert.equal(createdEntries.length, WRITE_COUNT);

      // 2. High Concurrency Reads (500 parallel reads across individual, metadata, and list)
      const readLatencies: number[] = [];
      const readPromises = Array.from({ length: READ_COUNT }, async (_, i) => {
        const target = createdEntries[i % createdEntries.length];
        const mode = i % 3;
        let path: string;

        if (mode === 0) path = `/api/entries/${target.id}`;
        else if (mode === 1) path = `/api/metadata`;
        else path = `/api/entries`;

        const t0 = performance.now();
        const res = await app.request(path);
        readLatencies.push(performance.now() - t0);

        assert.equal(res.status, 200, `Read failed for path ${path}`);
        const json = await res.json();
        if (mode === 0) {
          assert.equal(json.entry.id, target.id);
          assert.equal(json.entry.title, target.title);
        }
      });

      await Promise.all(readPromises);

      // 3. Concurrent Updates (80 updates)
      const updatePromises = createdEntries.slice(0, UPDATE_COUNT).map(async (entry, i) => {
        const res = await app.request(`/api/entries/${entry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Updated Title ${i}`,
            tags: ['stress', 'updated'],
          }),
        });
        assert.equal(res.status, 200);
      });
      await Promise.all(updatePromises);

      // 4. Concurrent Deletes (40 deletes)
      const deletePromises = createdEntries.slice(0, DELETE_COUNT).map(async (entry) => {
        const res = await app.request(`/api/entries/${entry.id}`, {
          method: 'DELETE',
        });
        assert.equal(res.status, 200);
      });
      await Promise.all(deletePromises);

      // 5. Final Data Integrity & Count Verification
      const listRes = await app.request('/api/entries');
      const listJson = await listRes.json();
      const expectedCount = WRITE_COUNT - DELETE_COUNT;
      assert.equal(listJson.entries.length, expectedCount);

      // Verify each remaining entry decrypts with pristine integrity
      for (const entry of listJson.entries) {
        assert.ok(entry.id);
        assert.ok(entry.title);
        assert.ok(entry.updatedAt > 0);
      }

      writeLatencies.sort((a, b) => a - b);
      readLatencies.sort((a, b) => a - b);
      const writeP99 = writeLatencies[Math.floor(writeLatencies.length * 0.99)];
      const readP99 = readLatencies[Math.floor(readLatencies.length * 0.99)];

      // Verify latencies are well within operational bounds
      assert.ok(writeP99 < 500, `Write p99 (${writeP99}ms) should be < 500ms`);
      assert.ok(readP99 < 3000, `Read p99 (${readP99}ms) should be < 3000ms`);
    });
  });

  describe('Suite 2: High Throughput Cryptographic Operations', () => {
    it('should execute Argon2id/Scrypt key derivations and 2,000+ AES-256-GCM cycles with 0 errors', () => {
      // 1. KDF Key Derivations under load
      const kdfIterations = 20;
      const kdfKeys: Buffer[] = [];
      const kdfStart = performance.now();

      for (let i = 0; i < kdfIterations; i++) {
        const salt = generateSalt(32);
        const key = deriveMasterKey(`StressPassword_${i}_#$!`, salt);
        assert.equal(key.length, 32);
        kdfKeys.push(key);
      }
      const kdfDuration = performance.now() - kdfStart;
      assert.ok(kdfDuration > 0);

      // 2. AES-256-GCM High Throughput Cycles
      const cipherKey = kdfKeys[0];
      const CIPHER_OPS = 2500;
      const cipherStart = performance.now();

      for (let i = 0; i < CIPHER_OPS; i++) {
        const payload = {
          id: `crypto-entry-${i}`,
          secretData: randomBytes(64 + (i % 256)).toString('hex'),
          index: i,
          timestamp: Date.now(),
        };

        const encrypted = encryptJson(payload, cipherKey);
        assert.ok(encrypted.iv);
        assert.ok(encrypted.authTag);
        assert.ok(encrypted.ciphertext);

        const decrypted = decryptJson<typeof payload>(encrypted, cipherKey);
        assert.equal(decrypted.id, payload.id);
        assert.equal(decrypted.secretData, payload.secretData);
        assert.equal(decrypted.index, payload.index);
      }
      const cipherDuration = performance.now() - cipherStart;
      const cipherThroughput = CIPHER_OPS / (cipherDuration / 1000);
      assert.ok(cipherThroughput > 1000, `Cipher throughput (${cipherThroughput.toFixed(0)} ops/s) should exceed 1,000 ops/s`);

      // 3. Zeroization Invariant
      for (const key of kdfKeys) {
        zeroizeBuffer(key);
        assert.ok(key.every((b) => b === 0), 'Buffer must be completely zeroed');
      }
    });
  });

  describe('Suite 3: Concurrent Sync Envelope Processing & Relay Throughput', () => {
    it('should process 50 concurrent device sync exchanges and relay operations without failure', async () => {
      // 1. 50 Concurrent Device Sync Sessions (P2P Handshake + Signed Envelopes)
      const DEVICE_PAIRS = 50;
      const syncPromises = Array.from({ length: DEVICE_PAIRS }, async (_, i) => {
        const devA = generateDeviceIdentity(`DeviceA_${i}`);
        const devB = generateDeviceIdentity(`DeviceB_${i}`);

        const pmA = new PairingManager(devA);
        const pmB = new PairingManager(devB);

        const { invitation, pairingCode } = pmA.createInvitation();
        const { exchangeMessage } = pmB.acceptInvitation(invitation, pairingCode);
        const { confirmation } = pmA.confirmPairing(pairingCode, exchangeMessage);
        pmB.finalizePairing(invitation, confirmation);

        const paired = pmA.getPairedDevice(devB.deviceId)!;
        const deltas: SyncDelta[] = [
          { entryId: `delta-${i}-a`, op: 'CREATE', updatedAt: Date.now(), version: 1, tags: ['sync'] },
          { entryId: `delta-${i}-b`, op: 'UPDATE', updatedAt: Date.now(), version: 2, tags: ['updated'] },
        ];

        const envelope = createSyncEnvelope(deltas, devA.privateKeyPem, devA.deviceId, devB.deviceId, paired.syncSecret);
        const unpacked = unpackSyncEnvelope(envelope, devA.publicKeyPem, paired.syncSecret);

        assert.equal(unpacked.length, 2);
        assert.equal(unpacked[0].entryId, `delta-${i}-a`);
      });

      await Promise.all(syncPromises);

      // 2. Relay Server Throughput Test
      const tempRelayDir = await mkdtemp(join(tmpdir(), 'verma-stress-test-relay-'));
      const relayToken = 'relay-stress-token-test-2026';

      const child = spawn(process.execPath, [RELAY_SCRIPT_PATH], {
        env: {
          ...process.env,
          PORT: '0',
          RELAY_AUTH_TOKEN: relayToken,
          RELAY_DATA_DIR: tempRelayDir,
          RELAY_MAX_ENVELOPE_BYTES: '1048576',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const port = await new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Relay startup timeout')), 5000);
        child.stdout.on('data', (chunk) => {
          const match = chunk.toString().match(/^listening:(\d+)$/m);
          if (match) {
            clearTimeout(timer);
            resolve(Number(match[1]));
          }
        });
        child.once('error', reject);
      });

      const relayUrl = `http://127.0.0.1:${port}`;

      try {
        // 50 concurrent relay writes
        const writePromises = Array.from({ length: 50 }, async (_, i) => {
          const envId = `env-test-${i.toString().padStart(3, '0')}-${randomUUID().slice(0, 8)}`;
          const payload = randomBytes(256);

          const res = await fetch(`${relayUrl}/v1/envelopes/${envId}`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${relayToken}`,
              'content-type': 'application/octet-stream',
              'x-verma-envelope-version': '1',
            },
            body: payload,
          });
          assert.equal(res.status, 201);
          return envId;
        });

        const createdEnvIds = await Promise.all(writePromises);

        // 100 concurrent relay reads
        const readPromises = Array.from({ length: 100 }, async (_, i) => {
          const targetId = createdEnvIds[i % createdEnvIds.length];
          const res = await fetch(`${relayUrl}/v1/envelopes/${targetId}`, {
            headers: { authorization: `Bearer ${relayToken}` },
          });
          assert.equal(res.status, 200);
        });

        await Promise.all(readPromises);
      } finally {
        child.kill();
        await rm(tempRelayDir, { recursive: true, force: true });
      }
    });
  });

  describe('Suite 4: Resource Exhaustion & Memory Stability', () => {
    it('should sustain 1,000+ operations without unbounded memory growth or leaks', async () => {
      const storage = new SqliteVaultStorage(':memory:');
      const repo = new VaultRepository(storage);
      await repo.initialize(masterPassword);

      if (global.gc) global.gc();
      const initialMem = process.memoryUsage();

      const TOTAL_OPS = 1000;
      for (let i = 0; i < TOTAL_OPS; i++) {
        if (i % 2 === 0) {
          const entry = await repo.createEntry({
            type: 'note',
            title: `Memory Stability Note ${i}`,
            content: `Encrypted memory payload ${i}: ${randomBytes(64).toString('hex')}`,
            tags: ['memory-test'],
          });
          if (i % 10 === 0) {
            await repo.getEntry(entry.id);
          }
        } else {
          const key = deriveMasterKey('fast-pass', '0123456789abcdef0123456789abcdef', { cost: 1024 });
          const enc = encryptJson({ i, payload: 'stability test string' }, key);
          decryptJson(enc, key);
          zeroizeBuffer(key);
        }
      }

      repo.close();

      if (global.gc) global.gc();
      const finalMem = process.memoryUsage();

      const rssGrowthMb = (finalMem.rss - initialMem.rss) / 1024 / 1024;
      const heapUsedGrowthMb = (finalMem.heapUsed - initialMem.heapUsed) / 1024 / 1024;

      // Ensure RSS growth is bounded under reasonable limit (< 80 MB)
      assert.ok(rssGrowthMb < 80, `RSS growth (${rssGrowthMb.toFixed(2)} MB) exceeded bound`);
      assert.ok(heapUsedGrowthMb < 50, `Heap growth (${heapUsedGrowthMb.toFixed(2)} MB) exceeded bound`);
    });
  });

  describe('Suite 5: Connection Recovery, Burst Traffic & Error Rates', () => {
    it('should maintain 0% valid transaction error rate under 200+ burst spikes and recover immediately after fault injection', async () => {
      const storage = new SqliteVaultStorage(':memory:');
      const repo = new VaultRepository(storage);
      await repo.initialize(masterPassword);
      const { app } = createApp({ repository: repo });

      // 1. Burst Traffic Spike: 200 concurrent valid requests
      const BURST_COUNT = 200;
      let validErrors = 0;

      const burstPromises = Array.from({ length: BURST_COUNT }, async (_, i) => {
        const isWrite = i % 4 === 0;
        let res: Response;

        if (isWrite) {
          res = await app.request('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'note',
              title: `Burst Entry ${i}`,
              content: `Burst Content ${i}`,
            }),
          });
        } else {
          res = await app.request('/api/vault/status');
        }

        if (!res.ok) validErrors++;
      });

      await Promise.all(burstPromises);
      assert.equal(validErrors, 0, 'Burst traffic must have 0% error rate on valid requests');

      // 2. Fault Injection: Fire 50 invalid requests
      const faultPromises = Array.from({ length: 50 }, async (_, i) => {
        if (i % 3 === 0) {
          // Non-existent entry
          const res = await app.request(`/api/entries/missing-id-${i}`);
          assert.equal(res.status, 404);
        } else if (i % 3 === 1) {
          // Invalid schema
          const res = await app.request('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'unknown_type', title: 'Bad' }),
          });
          assert.equal(res.status, 400);
        } else {
          // Invalid unlock attempt
          const res = await app.request('/api/vault/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'WrongPassword!' }),
          });
          assert.equal(res.status, 401);
        }
      });

      await Promise.all(faultPromises);

      // Re-unlock for subsequent operations
      await app.request('/api/vault/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: masterPassword }),
      });

      // 3. Post-Fault Immediate Recovery Test: 50 subsequent valid operations
      let postFaultErrors = 0;
      const recoveryPromises = Array.from({ length: 50 }, async () => {
        const res = await app.request('/api/entries');
        if (!res.ok) postFaultErrors++;
      });

      await Promise.all(recoveryPromises);
      assert.equal(postFaultErrors, 0, 'System must immediately recover with 0% error rate');
    });
  });
});
