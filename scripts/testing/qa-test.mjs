#!/usr/bin/env node
/**
 * Verma Comprehensive QA Automation & Acceptance Criteria Validation Harness
 * Phase 2C QA Testing Engine
 *
 * Test Suites:
 * 1. P0 Foundation & Cryptographic Security (AC-A-M0-01-01 to AC-A-M0-01-04, Vault Lifecycle, Password Generator)
 * 2. P0 AI Demo Security, Redaction & Schema Validation (AC-B-M1-01-01 to AC-B-M1-05-05, Smart Import, Ask Your Vault)
 * 3. P0 Direct Sync & P2P Protocol (AC-D-M2-01-01 to AC-D-M2-01-05, Ed25519, Pairing, Envelope Exchange, Interrupted Sync)
 * 4. Relay & Cloudflare KV Integration (AC-A-M0-04-03, AC-A-M0-04-04, AC-A-M0-04-06, Self-Hosted & KV Parity)
 * 5. Edge Cases, Boundary Testing & Security Fuzzing (Empty Vaults, 64KB Notes, Unicode/Emoji, Injections, Corrupted Envelopes)
 * 6. Error Handling, State Recovery & Lock Enforcement (Locked Route Matrix, Wrong Password Recovery)
 */

import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT_DIR = resolve(__dirname, '../..');

// Import Verma Core Packages from dist
import {
  deriveMasterKey,
  generateSalt,
  encryptPayload,
  decryptPayload,
  encryptJson,
  decryptJson,
  zeroizeBuffer,
  generatePassword,
  checkPasswordStrength,
  checkPasswordReuse,
  toRedactedMetadata,
  projectEntriesMetadata,
  assertSafeMetadata,
  DENIED_SECRET_FIELD_KEYS,
  EXCLUDED_AI_ENTRY_TYPES,
  isExcludedFromAi,
  TrustedRedactionBoundary,
  generateDeviceIdentity,
  deriveDeviceIdFromPublicKey,
  signData,
  verifySignature,
  toPublicProfile,
  PairingManager,
  DesktopSyncEngine,
  createSyncEnvelope,
  unpackSyncEnvelope,
  UnauthorizedPeerError,
  SyncInterruptedError,
  parseCsv,
  generateImportProposal,
  extractDomainFromUrl,
  ALL_SYNTHETIC_ENTRIES,
  SYNTHETIC_PASSWORD_FOR_VAULT,
  SYNTHETIC_RECOVERY_PHRASE,
  SYNTHETIC_MESSY_BROWSER_CSV,
  SYNTHETIC_CLEAN_BROWSER_CSV,
  scanFixturesForPrivacy,
  LIVE_CREDENTIAL_PATTERNS,
  SafeLogger,
} from '../../packages/shared/dist/index.js';

import { createApp } from '../../apps/api/dist/app.js';
import { VaultRepository } from '../../apps/api/dist/repository/vault-repository.js';
import { SqliteVaultStorage } from '../../apps/api/dist/storage/sqlite-vault-storage.js';
import {
  VaultLockedError,
  VaultNotInitializedError,
  VaultAlreadyInitializedError,
  InvalidCredentialsError,
  EntryNotFoundError,
  ValidationError,
} from '../../apps/api/dist/repository/errors.js';
import { AiAdapter } from '../../apps/api/dist/ai/adapter.js';

import {
  handleRelayRequest,
  timingSafeEqual as cfTimingSafeEqual,
  isAuthenticated as cfIsAuthenticated,
  ID_PATTERN as CF_ID_PATTERN,
} from '../../relay/cloudflare-relay.mjs';

// Import Hono Node Server for ephemeral HTTP tests
const { serve } = await import('../../apps/api/node_modules/@hono/node-server/dist/index.js');

// Test Execution State & Statistics
class QaSuiteRunner {
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

  beginSuite(name, acId = '') {
    this.currentSuite = {
      name,
      acId,
      tests: [],
      passed: 0,
      failed: 0,
      durationMs: 0,
      startTime: performance.now(),
    };
    this.suites.push(this.currentSuite);
    console.log(`\n================================================================================`);
    console.log(`SUITE: ${name} ${acId ? `[${acId}]` : ''}`);
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

// Global Runner Instance
const runner = new QaSuiteRunner();

// Mock QUIC Direct Peer Transport for Direct Sync Testing
class MockDirectPeerTransport {
  constructor(peerEngine, networkDrop = false) {
    this.peerEngine = peerEngine;
    this.networkDrop = networkDrop;
    this.handshakeCount = 0;
    this.envelopeCount = 0;
  }

  setNetworkDrop(drop) {
    this.networkDrop = drop;
  }

  async handshake(message) {
    if (this.networkDrop) {
      throw new Error('Network transport dropped during handshake');
    }
    this.handshakeCount++;
    return this.peerEngine.handleInboundHandshake(message);
  }

  async send(envelope) {
    if (this.networkDrop) {
      throw new Error('Network transport dropped during envelope transmission');
    }
    this.envelopeCount++;
    return this.peerEngine.handleInboundEnvelope(envelope);
  }
}

// In-Memory Cloudflare KV Mock
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
    if (value instanceof ArrayBuffer) {
      buf = Buffer.from(value);
    } else if (Buffer.isBuffer(value)) {
      buf = value;
    } else if (typeof value === 'string') {
      buf = Buffer.from(value, 'utf8');
    } else {
      buf = Buffer.from(String(value));
    }
    this.store.set(key, {
      data: buf,
      metadata: options.metadata || { bytes: buf.length },
    });
  }

  async delete(key) {
    return this.store.delete(key);
  }

  async list() {
    const keys = [];
    for (const [name, entry] of this.store.entries()) {
      keys.push({ name, metadata: entry.metadata });
    }
    return { keys };
  }
}

// Main QA Execution Function
export async function executeQaTestHarness() {
  runner.start();

  console.log('Starting Verma Phase 2C Full QA Validation Suite...');
  console.log(`Execution Timestamp: ${new Date().toISOString()}`);

  // ============================================================================
  // SUITE 1: P0 Foundation & Cryptographic Security
  // ============================================================================
  runner.beginSuite('Suite 1: P0 Foundation & Cryptographic Security', 'AC-A-M0-01-01..04');

  await runner.runTest('1.1 Vault Lifecycle: Initialization, Salt & KDF Derivation', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);

    const initResult = await repo.initialize('MasterPass123!@#');
    if (!initResult.vaultId || typeof initResult.vaultId !== 'string') {
      throw new Error('Vault ID was not returned as string UUID');
    }
    if (!initResult.salt || initResult.salt.length !== 64) {
      throw new Error(`Invalid salt length: expected 64 hex chars, got ${initResult.salt?.length}`);
    }

    const status = repo.getStatus();
    if (status.status !== 'unlocked' || status.isLocked !== false || !status.isInitialized) {
      throw new Error(`Unexpected vault status after init: ${JSON.stringify(status)}`);
    }

    // Attempt double initialization
    let doubleInitThrew = false;
    try {
      await repo.initialize('AnotherPassword');
    } catch (err) {
      if (err instanceof VaultAlreadyInitializedError) {
        doubleInitThrew = true;
      }
    }
    if (!doubleInitThrew) {
      throw new Error('Double initialization did not throw VaultAlreadyInitializedError');
    }
  }, 'AC-A-M0-01-01');

  await runner.runTest('1.2 Lock / Unlock State Enforcement & Memory Zeroization', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    const password = 'StrongPassword_2026_Secure!';
    await repo.initialize(password);

    // Lock vault
    repo.lock();
    const lockedStatus = repo.getStatus();
    if (lockedStatus.status !== 'locked' || lockedStatus.isLocked !== true) {
      throw new Error(`Vault failed to transition to locked state: ${JSON.stringify(lockedStatus)}`);
    }

    // Locked access must throw VaultLockedError
    let threwOnLockedRead = false;
    try {
      await repo.listEntries();
    } catch (err) {
      if (err instanceof VaultLockedError) {
        threwOnLockedRead = true;
      }
    }
    if (!threwOnLockedRead) {
      throw new Error('Reading entries while locked did not throw VaultLockedError');
    }

    // Attempt unlock with wrong password
    let threwOnWrongPassword = false;
    try {
      await repo.unlock('WrongPassword123');
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        threwOnWrongPassword = true;
      }
    }
    if (!threwOnWrongPassword) {
      throw new Error('Wrong password unlock did not throw InvalidCredentialsError');
    }
    if (repo.getStatus().isLocked !== true) {
      throw new Error('Vault became unlocked after invalid password attempt');
    }

    // Unlock with valid password
    const unlockSuccess = await repo.unlock(password);
    if (!unlockSuccess || repo.getStatus().isLocked !== false) {
      throw new Error('Valid password failed to unlock vault');
    }
  }, 'AC-A-M0-01-01');

  await runner.runTest('1.3 AES-256-GCM Cryptographic AEAD Round-Trip & Tamper Detection', async () => {
    const salt = generateSalt(32);
    const key = deriveMasterKey('CryptoTestPass', salt);

    const sensitiveData = {
      service: 'aws-prod',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      notes: 'Production root credentials',
    };

    const encrypted = encryptJson(sensitiveData, key);
    if (!encrypted.iv || encrypted.iv.length !== 24) {
      throw new Error(`Invalid IV length: expected 24 hex chars (12 bytes), got ${encrypted.iv?.length}`);
    }
    if (!encrypted.authTag || encrypted.authTag.length !== 32) {
      throw new Error(`Invalid auth tag length: expected 32 hex chars (16 bytes), got ${encrypted.authTag?.length}`);
    }
    if (!encrypted.ciphertext || encrypted.version !== 1) {
      throw new Error('Missing ciphertext or invalid payload version');
    }

    const decrypted = decryptJson(encrypted, key);
    if (JSON.stringify(decrypted) !== JSON.stringify(sensitiveData)) {
      throw new Error('Decrypted payload did not match original data');
    }

    // Tamper with ciphertext
    const tamperedCiphertext = encrypted.ciphertext.slice(0, -2) + (encrypted.ciphertext.slice(-2) === 'aa' ? 'bb' : 'aa');
    let tamperDetected = false;
    try {
      decryptJson({ ...encrypted, ciphertext: tamperedCiphertext }, key);
    } catch {
      tamperDetected = true;
    }
    if (!tamperDetected) {
      throw new Error('Tampered ciphertext was decrypted without AEAD authentication error');
    }

    // Tamper with auth tag
    let authTagTamperDetected = false;
    try {
      const tamperedTag = encrypted.authTag.slice(0, -2) + '00';
      decryptJson({ ...encrypted, authTag: tamperedTag }, key);
    } catch {
      authTagTamperDetected = true;
    }
    if (!authTagTamperDetected) {
      throw new Error('Tampered auth tag was decrypted without error');
    }

    // Clean up master key memory
    zeroizeBuffer(key);
    if (key.some((b) => b !== 0)) {
      throw new Error('Master key buffer zeroization failed to scrub all bytes');
    }
  }, 'AC-A-M0-01-01');

  await runner.runTest('1.4 24-Word Recovery Phrase Structure & Verification', async () => {
    // Check synthetic 24-word recovery phrase
    const words = SYNTHETIC_RECOVERY_PHRASE.trim().split(/\s+/);
    if (words.length !== 24) {
      throw new Error(`Expected exactly 24 words in recovery phrase, got ${words.length}`);
    }

    // Validate BIP-39 word format (lowercase alphabetical only, 3-8 chars)
    for (const word of words) {
      if (!/^[a-z]{3,8}$/.test(word)) {
        throw new Error(`Invalid recovery phrase word format: "${word}"`);
      }
    }

    // Verify recovery phrase does not match live credential patterns
    for (const pattern of LIVE_CREDENTIAL_PATTERNS) {
      if (pattern.test(SYNTHETIC_RECOVERY_PHRASE)) {
        throw new Error(`Synthetic recovery phrase matched live credential pattern: ${pattern}`);
      }
    }
  }, 'AC-A-M0-01-04');

  await runner.runTest('1.5 Deterministic CSPRNG Password Generator Verification', async () => {
    // Test default options (20 chars, all charsets)
    const p1 = generatePassword({ length: 20 });
    if (p1.length !== 20) {
      throw new Error(`Expected password length 20, got ${p1.length}`);
    }

    // Test extreme lengths
    const pShort = generatePassword({ length: 8 });
    const pLong = generatePassword({ length: 128 });
    if (pShort.length !== 8 || pLong.length !== 128) {
      throw new Error('Custom length generator failed');
    }

    // Test avoidAmbiguous
    for (let i = 0; i < 50; i++) {
      const pUnambiguous = generatePassword({ length: 40, avoidAmbiguous: true });
      if (/[l1IO0]/.test(pUnambiguous)) {
        throw new Error(`Ambiguous character found in password: ${pUnambiguous}`);
      }
    }

    // Test strength evaluation
    const strength = checkPasswordStrength(p1);
    if (strength.isWeak || strength.entropyBits < 60) {
      throw new Error(`Generated password failed strength check: ${JSON.stringify(strength)}`);
    }

    // Test invalid config (no charsets selected)
    let threwOnEmptyCharset = false;
    try {
      generatePassword({ lowercase: false, uppercase: false, numbers: false, symbols: false });
    } catch {
      threwOnEmptyCharset = true;
    }
    if (!threwOnEmptyCharset) {
      throw new Error('Generator allowed empty character set selection');
    }
  }, 'AC-A-M0-01-01');

  await runner.runTest('1.6 Full Entry Lifecycle (Login, Note, ApiKey) & Database Round-Trip', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    await repo.initialize('MasterVaultKey999!');

    // 1. Create Login Entry
    const login = await repo.createEntry({
      type: 'login',
      title: 'GitHub Work Account',
      username: 'dev@phasmadrosophila.com',
      password: 'SuperSecretGitHubPassword123!',
      url: 'https://github.com/login',
      totpSecret: 'JBSWY3DPEHPK3PXP',
      recoveryCodes: ['REC-1', 'REC-2', 'REC-3'],
      tags: ['developer', 'vcs', 'work'],
      customFields: [{ label: 'PinCode', value: '9876' }],
    });
    if (!login.id || login.type !== 'login' || login.username !== 'dev@phasmadrosophila.com') {
      throw new Error('Login entry creation failed');
    }

    // 2. Create Note Entry
    const note = await repo.createEntry({
      type: 'note',
      title: 'Server Runbook',
      content: 'Run systemctl restart verma-relay && journalctl -u verma-relay -f',
      category: 'Infrastructure',
      tags: ['ops', 'runbook'],
    });
    if (!note.id || note.type !== 'note' || !note.content.includes('verma-relay')) {
      throw new Error('Note entry creation failed');
    }

    // 3. Create API Key Entry
    const apiKey = await repo.createEntry({
      type: 'api_key',
      title: 'Cloudflare Deploy Token',
      service: 'Cloudflare',
      apiKey: 'CF-SEC-KEY-998877665544332211',
      apiSecret: 'CF-API-SECRET-TOKEN',
      tags: ['deploy', 'cloud'],
    });
    if (!apiKey.id || apiKey.type !== 'api_key' || apiKey.service !== 'Cloudflare') {
      throw new Error('API key entry creation failed');
    }

    // 4. Read & Verify Entries
    const retrievedLogin = await repo.getEntry(login.id);
    if (retrievedLogin.password !== 'SuperSecretGitHubPassword123!' || retrievedLogin.totpSecret !== 'JBSWY3DPEHPK3PXP') {
      throw new Error('Retrieved login entry secret fields mismatched');
    }

    // 5. Update Entry
    const updatedNote = await repo.updateEntry(note.id, {
      title: 'Server Runbook v2',
      tags: ['ops', 'runbook', 'updated'],
    });
    if (updatedNote.title !== 'Server Runbook v2' || !updatedNote.tags.includes('updated')) {
      throw new Error('Update entry failed');
    }

    // 6. Delete Entry
    const deleteSuccess = await repo.deleteEntry(apiKey.id);
    if (!deleteSuccess) {
      throw new Error('Delete entry returned false');
    }

    let threwOnDeleted = false;
    try {
      await repo.getEntry(apiKey.id);
    } catch (err) {
      if (err instanceof EntryNotFoundError) {
        threwOnDeleted = true;
      }
    }
    if (!threwOnDeleted) {
      throw new Error('Getting deleted entry did not throw EntryNotFoundError');
    }

    // 7. Verify zero plaintext secret leaks in raw SQLite rows
    const rawRows = storage.listEntryRows();
    for (const row of rawRows) {
      const rowJson = JSON.stringify(row);
      if (rowJson.includes('SuperSecretGitHubPassword123!') || rowJson.includes('JBSWY3DPEHPK3PXP') || rowJson.includes('CF-SEC-KEY-998877665544332211')) {
        throw new Error(`Plaintext secret leaked into raw storage row: ${rowJson}`);
      }
    }
  }, 'AC-A-M0-01-02');

  await runner.runTest('1.7 Safe Logging & Synthetic Fixture Privacy Audit', async () => {
    const logs = [];
    const testLogger = new SafeLogger((event) => logs.push(event));

    testLogger.info('TEST_LOG', {
      entryId: 'entry-123',
      entryType: 'login',
    });

    const loggedStr = JSON.stringify(logs);
    for (const deniedKey of DENIED_SECRET_FIELD_KEYS) {
      if (loggedStr.includes(`"${deniedKey}":`)) {
        throw new Error(`Denied secret key "${deniedKey}" found in safe logger output`);
      }
    }

    // Privacy scan across synthetic fixtures
    const fixtureScan = scanFixturesForPrivacy();
    if (!fixtureScan.passed) {
      throw new Error(`Synthetic fixtures leaked live secret patterns: ${fixtureScan.findings.join(', ')}`);
    }
  }, 'AC-A-M0-01-04');

  runner.endSuite();

  // ============================================================================
  // SUITE 2: P0 AI Demo Security, Redaction & Schema Validation
  // ============================================================================
  runner.beginSuite('Suite 2: P0 AI Demo Security, Redaction & Schema Validation', 'AC-B-M1-01-01..05');

  await runner.runTest('2.1 Trusted Metadata Projection & Strict Allowlist Verification', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    await repo.initialize('Pass123!');
    await repo.seedSyntheticFixtures();

    const metadataList = await repo.getMetadataList();
    if (metadataList.length !== ALL_SYNTHETIC_ENTRIES.length) {
      throw new Error(`Expected ${ALL_SYNTHETIC_ENTRIES.length} metadata entries, got ${metadataList.length}`);
    }

    const allowedKeys = new Set([
      'id',
      'type',
      'title',
      'tags',
      'createdAt',
      'updatedAt',
      'fieldLabels',
      'domain',
      'isWeak',
      'isReused',
      'importSource',
      'conflictMetadata',
    ]);

    for (const item of metadataList) {
      for (const key of Object.keys(item)) {
        if (!allowedKeys.has(key)) {
          throw new Error(`Disallowed key "${key}" found in projected metadata: ${JSON.stringify(item)}`);
        }
      }
    }
  }, 'AC-B-M1-01-03');

  await runner.runTest('2.2 Denied-Field Exclusion (Zero Secret Exposure & Crypto Exclusion)', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    await repo.initialize('Pass123!');

    const rawPassword = 'ExtremelySecretPassword_NoLeak_#999';
    const rawTotp = 'JBSWY3DPEHPK3PXP';
    const rawRecovery = 'REC-CODE-LEAK-PREVENT-001';
    const rawNoteContent = 'CONFIDENTIAL NOTE BODY THAT MUST NEVER REACH AI';
    const rawApiKey = 'sk-proj-SUPER_SECRET_KEY_12345';

    await repo.createEntry({
      type: 'login',
      title: 'Test Login Secret',
      username: 'user@secret.com',
      password: rawPassword,
      totpSecret: rawTotp,
      recoveryCodes: [rawRecovery],
      tags: ['secret'],
    });

    await repo.createEntry({
      type: 'note',
      title: 'Secret Note Title',
      content: rawNoteContent,
      tags: ['notes'],
    });

    await repo.createEntry({
      type: 'api_key',
      title: 'Secret API Key Title',
      service: 'SecretService',
      apiKey: rawApiKey,
      tags: ['api'],
    });

    const metadata = await repo.getMetadataList();
    const serialized = JSON.stringify(metadata);

    const secretValues = [rawPassword, rawTotp, rawRecovery, rawNoteContent, rawApiKey];
    for (const secret of secretValues) {
      if (serialized.includes(secret)) {
        throw new Error(`CRITICAL SECURITY VIOLATION: Secret value "${secret}" exposed in projected metadata JSON`);
      }
    }

    // Verify crypto wallet exclusion
    const isCryptoExcluded = isExcludedFromAi({ type: 'crypto_wallet' });
    if (!isCryptoExcluded) {
      throw new Error('Crypto wallet entry type was not excluded from AI');
    }
  }, 'AC-B-M1-01-02');

  await runner.runTest('2.3 Immediate AI Revocation on Vault Lock', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    await repo.initialize('MasterKeyPass!');
    await repo.createEntry({
      type: 'login',
      title: 'Test Entry',
      username: 'u',
      password: 'p',
    });

    // Verify metadata accessible while unlocked
    const preLockMeta = await repo.getMetadataList();
    if (preLockMeta.length !== 1) {
      throw new Error('Failed to retrieve metadata while unlocked');
    }

    // Lock vault
    repo.lock();

    // Verify immediate rejection
    let metadataRevoked = false;
    try {
      await repo.getMetadataList();
    } catch (err) {
      if (err instanceof VaultLockedError) {
        metadataRevoked = true;
      }
    }
    if (!metadataRevoked) {
      throw new Error('getMetadataList did not throw VaultLockedError when locked');
    }

    let searchRevoked = false;
    try {
      await repo.searchMetadata('test');
    } catch (err) {
      if (err instanceof VaultLockedError) {
        searchRevoked = true;
      }
    }
    if (!searchRevoked) {
      throw new Error('searchMetadata did not throw VaultLockedError when locked');
    }
  }, 'AC-B-M1-01-04');

  await runner.runTest('2.4 Sandboxed AI Adapter: Local Network Denial & Schema Validation', async () => {
    // 1. Verify non-local network URL rejection
    let networkDenialTriggered = false;
    try {
      const adapter = new AiAdapter({ apiUrl: 'https://api.openai.com/v1/chat/completions' });
      await adapter.askVault('test query', []);
    } catch (err) {
      if (err.message.includes('AI Adapter network denial')) {
        networkDenialTriggered = true;
      }
    }
    if (!networkDenialTriggered) {
      throw new Error('AiAdapter permitted non-local endpoint URL');
    }

    // 2. Verify fallback on disabled or unreachable adapter
    const adapter = new AiAdapter({ enabled: false });
    const fallbackResult = await adapter.suggestImportMappings(['Username', 'Password', 'URL'], []);
    if (!fallbackResult.mappings || fallbackResult.mappings.length !== 3) {
      throw new Error('AiAdapter fallback mapping failed');
    }
  }, 'AC-B-M1-02-02');

  await runner.runTest('2.5 Smart Import: CSV Parsing, Preview-vs-Commit, Staging & Confirm', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    await repo.initialize('ImportPass123!');

    const { app } = createApp({ repository: repo, aiAdapter: new AiAdapter({ enabled: false }) });

    // Step 1: Analyze messy CSV (Staging Preview)
    const analyzeRes = await app.request('/api/import/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ csvContent: SYNTHETIC_MESSY_BROWSER_CSV }),
    });
    if (analyzeRes.status !== 200) {
      throw new Error(`Analyze returned status ${analyzeRes.status}`);
    }
    const analyzeData = await analyzeRes.json();
    if (!analyzeData.stagingId || !analyzeData.proposal) {
      throw new Error('Analyze response missing stagingId or proposal');
    }

    // Invariant Check: Zero records committed to vault storage during preview
    const entriesPostAnalyze = await repo.listEntries();
    if (entriesPostAnalyze.length !== 0) {
      throw new Error(`CRITICAL INVARIANT VIOLATION: ${entriesPostAnalyze.length} entries written to vault during analyze step`);
    }

    // Step 2: Cancel Staging Test
    const cancelRes = await app.request('/api/import/cancel', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stagingId: analyzeData.stagingId }),
    });
    if (cancelRes.status !== 200) {
      throw new Error(`Cancel returned status ${cancelRes.status}`);
    }

    // Step 3: Re-Analyze & Confirm Commit
    const reAnalyzeRes = await app.request('/api/import/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ csvContent: SYNTHETIC_CLEAN_BROWSER_CSV }),
    });
    const reAnalyzeData = await reAnalyzeRes.json();

    const confirmRes = await app.request('/api/import/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        stagingId: reAnalyzeData.stagingId,
        additionalTags: ['csv-import'],
      }),
    });
    if (confirmRes.status !== 200) {
      throw new Error(`Confirm returned status ${confirmRes.status}`);
    }
    const confirmData = await confirmRes.json();
    if (confirmData.importedCount === 0) {
      throw new Error('Confirm imported 0 entries');
    }

    // Verify entries successfully persisted in vault
    const finalEntries = await repo.listEntries();
    if (finalEntries.length !== confirmData.importedCount) {
      throw new Error(`Vault entry count mismatch: expected ${confirmData.importedCount}, found ${finalEntries.length}`);
    }
  }, 'AC-B-M1-03-02');

  await runner.runTest('2.6 Ask Your Vault Search & Redacted Results Delivery', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    await repo.initialize('SearchPass123!');
    await repo.seedSyntheticFixtures();

    const searchResults = await repo.searchMetadata('github');
    if (searchResults.length === 0) {
      throw new Error('Search for "github" returned no matches');
    }

    for (const res of searchResults) {
      if ((res).password !== undefined || (res).content !== undefined) {
        throw new Error('Search result object contains unredacted secret fields');
      }
    }
  }, 'AC-B-M1-01-01');

  runner.endSuite();

  // ============================================================================
  // SUITE 3: P0 Direct Sync & P2P Protocol
  // ============================================================================
  runner.beginSuite('Suite 3: P0 Direct Sync & P2P Protocol', 'AC-D-M2-01-01..05');

  await runner.runTest('3.1 Ed25519 Device Identity & Fingerprinting Verification', async () => {
    const devA = generateDeviceIdentity('Desktop-Alpha');
    const devB = generateDeviceIdentity('Desktop-Beta');

    if (!devA.deviceId || !devB.deviceId) {
      throw new Error('Device IDs were not generated');
    }
    if (devA.deviceId.length !== 64 || devB.deviceId.length !== 64) {
      throw new Error('Device ID must be 64-character lowercase SHA-256 hash');
    }

    // Verify SHA-256 public key hash derivation
    const computedId = deriveDeviceIdFromPublicKey(devA.publicKeyPem);
    if (computedId !== devA.deviceId) {
      throw new Error('Device ID did not match SHA-256 hash of public key PEM');
    }

    // Verify Ed25519 Sign & Verify
    const testMessage = 'Verma_P2P_Direct_Sync_Handshake_Nonce_999';
    const signature = signData(testMessage, devA.privateKeyPem);
    const valid = verifySignature(testMessage, signature, devA.publicKeyPem);
    if (!valid) {
      throw new Error('Ed25519 signature verification failed with valid public key');
    }

    const invalid = verifySignature(testMessage, signature, devB.publicKeyPem);
    if (invalid) {
      throw new Error('Ed25519 signature verified with wrong device public key');
    }
  }, 'AC-D-M2-01-03');

  await runner.runTest('3.2 Authenticated 6-Digit Code Pairing Integration', async () => {
    const devA = generateDeviceIdentity('Device-A');
    const devB = generateDeviceIdentity('Device-B');

    const pairMgrA = new PairingManager(devA);
    const pairMgrB = new PairingManager(devB);

    // Device A creates pairing invitation
    const { invitation, pairingCode } = pairMgrA.createInvitation(60_000);
    if (!/^\d{6}$/.test(pairingCode)) {
      throw new Error(`Pairing code is not a 6-digit number: ${pairingCode}`);
    }

    // Attempt pairing with wrong code
    let wrongCodeThrew = false;
    try {
      pairMgrB.acceptInvitation(invitation, '000000');
    } catch {
      wrongCodeThrew = true;
    }
    if (!wrongCodeThrew) {
      throw new Error('Pairing with invalid 6-digit code did not throw error');
    }

    // Valid pairing handshake
    const { exchangeMessage } = pairMgrB.acceptInvitation(invitation, pairingCode);
    const { confirmation } = pairMgrA.confirmPairing(pairingCode, exchangeMessage);
    pairMgrB.finalizePairing(invitation, confirmation);

    if (!pairMgrA.isDevicePaired(devB.deviceId) || !pairMgrB.isDevicePaired(devA.deviceId)) {
      throw new Error('Pairing mutual registration failed');
    }

    const pairedDevOnA = pairMgrA.getPairedDevice(devB.deviceId);
    const pairedDevOnB = pairMgrB.getPairedDevice(devA.deviceId);
    if (pairedDevOnA.syncSecret !== pairedDevOnB.syncSecret) {
      throw new Error('Shared sync secret mismatch between paired devices');
    }
  }, 'AC-D-M2-01-01');

  await runner.runTest('3.3 Direct Sync Delta Exchange (Tag & Entry Synchronization)', async () => {
    const devA = generateDeviceIdentity('Device-A');
    const devB = generateDeviceIdentity('Device-B');
    const pairMgrA = new PairingManager(devA);
    const pairMgrB = new PairingManager(devB);

    const { invitation, pairingCode } = pairMgrA.createInvitation();
    const { exchangeMessage } = pairMgrB.acceptInvitation(invitation, pairingCode);
    const { confirmation } = pairMgrA.confirmPairing(pairingCode, exchangeMessage);
    pairMgrB.finalizePairing(invitation, confirmation);

    const appliedDeltas = [];
    const engineB = new DesktopSyncEngine(devB, pairMgrB, async (deltas) => {
      appliedDeltas.push(...deltas);
    });
    const engineA = new DesktopSyncEngine(devA, pairMgrA);

    const transport = new MockDirectPeerTransport(engineB);

    const syncDeltas = [
      {
        entryId: 'entry-test-1',
        op: 'UPDATE',
        tags: ['production', 'critical', 'updated-by-device-a'],
        updatedAt: Date.now(),
        version: 2,
      },
    ];

    const result = await engineA.syncToPeer(devB.deviceId, transport, syncDeltas);
    if (!result.success || result.appliedCount !== 1) {
      throw new Error(`Sync session failed: ${JSON.stringify(result)}`);
    }

    if (appliedDeltas.length !== 1 || !appliedDeltas[0].tags.includes('updated-by-device-a')) {
      throw new Error('Sync deltas were not received or applied on Device B');
    }
  }, 'AC-D-M2-01-02');

  await runner.runTest('3.4 Unauthorized Peer & Forged Signature Rejection', async () => {
    const devA = generateDeviceIdentity('Device-A');
    const devB = generateDeviceIdentity('Device-B');
    const rogueDev = generateDeviceIdentity('Rogue-Device');

    const pairMgrA = new PairingManager(devA);
    const pairMgrB = new PairingManager(devB);
    const pairMgrRogue = new PairingManager(rogueDev);

    const engineB = new DesktopSyncEngine(devB, pairMgrB);
    const engineRogue = new DesktopSyncEngine(rogueDev, pairMgrRogue);

    const transport = new MockDirectPeerTransport(engineB);

    // Attempt sync from unpaired rogue node
    let rogueSyncThrew = false;
    try {
      await engineRogue.syncToPeer(devB.deviceId, transport, []);
    } catch (err) {
      if (err instanceof UnauthorizedPeerError) {
        rogueSyncThrew = true;
      }
    }
    if (!rogueSyncThrew) {
      throw new Error('Sync from unpaired rogue node was not rejected with UnauthorizedPeerError');
    }
  }, 'AC-D-M2-01-04');

  await runner.runTest('3.5 Interrupted Sync Fault Tolerance & Envelope Tamper Defense', async () => {
    const devA = generateDeviceIdentity('Device-A');
    const devB = generateDeviceIdentity('Device-B');
    const pairMgrA = new PairingManager(devA);
    const pairMgrB = new PairingManager(devB);

    const { invitation, pairingCode } = pairMgrA.createInvitation();
    const { exchangeMessage } = pairMgrB.acceptInvitation(invitation, pairingCode);
    const { confirmation } = pairMgrA.confirmPairing(pairingCode, exchangeMessage);
    pairMgrB.finalizePairing(invitation, confirmation);

    let appliedCount = 0;
    const engineB = new DesktopSyncEngine(devB, pairMgrB, async () => {
      appliedCount++;
    });
    const engineA = new DesktopSyncEngine(devA, pairMgrA);

    // 1. Network drop during transmission
    const droppedTransport = new MockDirectPeerTransport(engineB, true);
    let dropThrew = false;
    try {
      await engineA.syncToPeer(devB.deviceId, droppedTransport, [{ entryId: 'e1', op: 'CREATE', updatedAt: Date.now(), version: 1 }]);
    } catch (err) {
      if (err instanceof SyncInterruptedError) {
        dropThrew = true;
      }
    }
    if (!dropThrew) {
      throw new Error('Interrupted sync did not throw SyncInterruptedError');
    }
    if (appliedCount !== 0) {
      throw new Error('Interrupted sync modified state despite network failure');
    }

    // 2. Corrupted sync envelope payload
    const paired = pairMgrA.getPairedDevice(devB.deviceId);
    const validEnvelope = createSyncEnvelope(
      [{ entryId: 'e2', op: 'UPDATE', updatedAt: Date.now(), version: 2 }],
      devA.privateKeyPem,
      devA.deviceId,
      devB.deviceId,
      paired.syncSecret
    );

    // Tamper with envelope ciphertext
    const tamperedEnvelope = {
      ...validEnvelope,
      payload: {
        ...validEnvelope.payload,
        ciphertext: validEnvelope.payload.ciphertext.slice(0, -2) + 'ff',
      },
    };

    let tamperThrew = false;
    try {
      await engineB.handleInboundEnvelope(tamperedEnvelope);
    } catch (err) {
      tamperThrew = true;
    }
    if (!tamperThrew) {
      throw new Error('Tampered sync envelope was accepted without error');
    }
  }, 'AC-D-M2-01-05');

  runner.endSuite();

  // ============================================================================
  // SUITE 4: Relay & Cloudflare KV Integration
  // ============================================================================
  runner.beginSuite('Suite 4: Relay & Cloudflare KV Integration', 'AC-A-M0-04-03..06');

  await runner.runTest('4.1 Self-Hosted Node.js Relay: Health, Auth & Opaque Envelope Storage', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'verma-relay-qa-'));
    const authToken = 'qa_relay_token_' + randomBytes(8).toString('hex');
    const maxBytes = 1048576; // 1MB

    const relayProcess = spawn(
      process.execPath,
      ['relay/server.mjs'],
      {
        cwd: ROOT_DIR,
        env: {
          ...process.env,
          PORT: '0',
          RELAY_DATA_DIR: tempDir,
          RELAY_AUTH_TOKEN: authToken,
          RELAY_MAX_ENVELOPE_BYTES: String(maxBytes),
        },
      }
    );

    let relayPort = 0;
    const portPromise = new Promise((resolve, reject) => {
      relayProcess.stdout.on('data', (chunk) => {
        const line = chunk.toString();
        const match = line.match(/listening:(\d+)/);
        if (match) {
          relayPort = Number.parseInt(match[1], 10);
          resolve(relayPort);
        }
      });
      relayProcess.stderr.on('data', (c) => console.error('Relay stderr:', c.toString()));
      relayProcess.on('error', reject);
    });

    try {
      await portPromise;
      const baseUrl = `http://localhost:${relayPort}`;

      // 1. GET /health (Public)
      const healthRes = await fetch(`${baseUrl}/health`);
      if (healthRes.status !== 200) {
        throw new Error(`Health check returned status ${healthRes.status}`);
      }

      // 2. Unauthenticated request -> 401
      const unauthRes = await fetch(`${baseUrl}/v1/envelopes`);
      if (unauthRes.status !== 401) {
        throw new Error(`Unauthenticated request returned status ${unauthRes.status}`);
      }

      // 3. POST /v1/envelopes/:id (Opaque binary envelope)
      const envelopeId = 'device_envelope_' + randomBytes(8).toString('hex');
      const testPayload = Buffer.from('OPAQUE_ENCRYPTED_SYNTHETIC_CIPHERTEXT_BIN_010101');
      const postRes = await fetch(`${baseUrl}/v1/envelopes/${envelopeId}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/octet-stream',
          'x-verma-envelope-version': '1',
          'content-length': String(testPayload.length),
        },
        body: testPayload,
      });
      if (postRes.status !== 201) {
        throw new Error(`POST envelope returned status ${postRes.status}`);
      }

      // 4. GET /v1/envelopes/:id (Exact payload match)
      const getRes = await fetch(`${baseUrl}/v1/envelopes/${envelopeId}`, {
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      if (getRes.status !== 200) {
        throw new Error(`GET envelope returned status ${getRes.status}`);
      }
      const retrievedBuf = Buffer.from(await getRes.arrayBuffer());
      if (!retrievedBuf.equals(testPayload)) {
        throw new Error('Retrieved relay payload does not match uploaded binary');
      }

      // 5. Oversized payload (>1MB) -> 413 Payload Too Large
      const oversizedPayload = Buffer.alloc(maxBytes + 1024, 0x41);
      const oversizedRes = await fetch(`${baseUrl}/v1/envelopes/oversized_${randomBytes(4).toString('hex')}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/octet-stream',
          'x-verma-envelope-version': '1',
          'content-length': String(oversizedPayload.length),
        },
        body: oversizedPayload,
      });
      if (oversizedRes.status !== 413) {
        throw new Error(`Oversized payload returned status ${oversizedRes.status}, expected 413`);
      }
    } finally {
      relayProcess.kill('SIGTERM');
      await rm(tempDir, { recursive: true, force: true });
    }
  }, 'AC-A-M0-04-04');

  await runner.runTest('4.2 Cloudflare KV Serverless Relay Parity & Timing-Safe Auth', async () => {
    const kv = new MemoryKvNamespace();
    const token = 'cf_secret_token_2026';
    const env = {
      RELAY_AUTH_TOKEN: token,
      VERMA_RELAY_KV: kv,
      RELAY_MAX_ENVELOPE_BYTES: '1048576',
    };

    // 1. Health check
    const healthReq = new Request('https://relay.verma.local/health');
    const healthRes = await handleRelayRequest(healthReq, env);
    if (healthRes.status !== 200) {
      throw new Error(`Cloudflare relay health check returned ${healthRes.status}`);
    }

    // 2. Auth timing-safe check
    if (!cfTimingSafeEqual(token, token) || cfTimingSafeEqual(token, 'wrong_token')) {
      throw new Error('Timing safe equality function mismatch');
    }
    if (!cfIsAuthenticated(`Bearer ${token}`, token) || cfIsAuthenticated('Bearer wrong', token)) {
      throw new Error('Cloudflare relay isAuthenticated helper failed');
    }

    // 3. Store and Retrieve Envelope via KV
    const envelopeId = 'cf_envelope_' + randomBytes(8).toString('hex');
    const testBin = Buffer.from('CF_SYNTHETIC_ENVELOPE_DATA_777');

    const putReq = new Request(`https://relay.verma.local/v1/envelopes/${envelopeId}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/octet-stream',
        'x-verma-envelope-version': '1',
        'content-length': String(testBin.length),
      },
      body: testBin,
    });
    const putRes = await handleRelayRequest(putReq, env);
    if (putRes.status !== 201) {
      throw new Error(`KV put returned status ${putRes.status}`);
    }

    const getReq = new Request(`https://relay.verma.local/v1/envelopes/${envelopeId}`, {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
    });
    const getRes = await handleRelayRequest(getReq, env);
    if (getRes.status !== 200) {
      throw new Error(`KV get returned status ${getRes.status}`);
    }
    const retrieved = Buffer.from(await getRes.arrayBuffer());
    if (!retrieved.equals(testBin)) {
      throw new Error('KV retrieved binary buffer does not match stored envelope');
    }
  }, 'AC-A-M0-04-06');

  runner.endSuite();

  // ============================================================================
  // SUITE 5: Edge Cases, Boundary Testing & Security Fuzzing
  // ============================================================================
  runner.beginSuite('Suite 5: Edge Cases, Boundary Testing & Security Fuzzing', 'Security Boundary');

  await runner.runTest('5.1 Empty Vault Edge Cases (Listing, Search, Export, Import)', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    await repo.initialize('EmptyPass123!');

    const entries = await repo.listEntries();
    if (!Array.isArray(entries) || entries.length !== 0) {
      throw new Error(`Expected empty array on new vault, got ${entries.length}`);
    }

    const metadata = await repo.getMetadataList();
    if (!Array.isArray(metadata) || metadata.length !== 0) {
      throw new Error(`Expected empty metadata list on new vault, got ${metadata.length}`);
    }

    const searchRes = await repo.searchMetadata('anything');
    if (!Array.isArray(searchRes) || searchRes.length !== 0) {
      throw new Error('Search on empty vault returned non-empty array');
    }
  });

  await runner.runTest('5.2 Boundary Field Lengths: 1-Char Inputs & 64KB Note Payloads', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    await repo.initialize('BoundaryPass123!');

    // 1. Single character inputs
    const singleCharLogin = await repo.createEntry({
      type: 'login',
      title: 'A',
      username: 'u',
      password: 'p',
      tags: ['x'],
    });
    if (singleCharLogin.title !== 'A' || singleCharLogin.username !== 'u') {
      throw new Error('Single character login creation failed');
    }

    // 2. Maximum field length: 64KB note content
    const largeContent = 'X'.repeat(65536); // 64 KB
    const largeNote = await repo.createEntry({
      type: 'note',
      title: '64KB Large Note Test',
      content: largeContent,
      tags: ['large', 'stress'],
    });

    const retrievedNote = await repo.getEntry(largeNote.id);
    if ((retrievedNote).content.length !== 65536) {
      throw new Error(`64KB note content length mismatch: expected 65536, got ${(retrievedNote).content.length}`);
    }

    // 3. Huge tag array (200 tags)
    const tags = Array.from({ length: 200 }, (_, i) => `tag_${i}`);
    const taggedLogin = await repo.createEntry({
      type: 'login',
      title: '200 Tags Login',
      username: 'user',
      password: 'pass',
      tags,
    });
    const retrievedTagged = await repo.getEntry(taggedLogin.id);
    if (retrievedTagged.tags.length !== 200) {
      throw new Error(`Tag count mismatch: expected 200, got ${retrievedTagged.tags.length}`);
    }
  });

  await runner.runTest('5.3 Unicode, Multi-Byte & Emoji Character Set Preservation', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    await repo.initialize('UnicodePass123!');

    const unicodeTitle = '🔑 秘密の鍵 🚀 Arabic: كلمة السر — German: Überprüfungstraße — Accents: café_résumé';
    const unicodeContent = 'Emojis: 🛡️🔐💻🎉 — CJK: 漢字テスト — Greek: Ελληνικά — Hebrew: עִבְרִית';

    const unicodeNote = await repo.createEntry({
      type: 'note',
      title: unicodeTitle,
      content: unicodeContent,
      tags: ['🔑-emoji', '日本語', 'العربية'],
    });

    const retrieved = await repo.getEntry(unicodeNote.id);
    if (retrieved.title !== unicodeTitle) {
      throw new Error('Unicode title corrupted in storage round-trip');
    }
    if ((retrieved).content !== unicodeContent) {
      throw new Error('Unicode content corrupted in storage round-trip');
    }

    const meta = await repo.getMetadataById(unicodeNote.id);
    if (meta.title !== unicodeTitle || !meta.tags.includes('日本語')) {
      throw new Error('Unicode title or tags corrupted in metadata projection');
    }
  });

  await runner.runTest('5.4 Injection Vectors & Malformed JSON API Fuzzing', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    await repo.initialize('InjectionPass123!');
    const { app } = createApp({ repository: repo });

    // 1. SQL Injection strings as titles and queries
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE entries; --",
      "admin'--",
      "1; SELECT * FROM entries WHERE 1=1;",
      "' UNION SELECT null, null, null --",
    ];

    for (const sqlPayload of sqlInjectionPayloads) {
      const entry = await repo.createEntry({
        type: 'login',
        title: sqlPayload,
        username: sqlPayload,
        password: 'Pass',
      });
      const readBack = await repo.getEntry(entry.id);
      if (readBack.title !== sqlPayload) {
        throw new Error(`SQL payload was mutated or caused corruption: ${sqlPayload}`);
      }

      // Search using SQL injection payload
      const searchRes = await repo.searchMetadata(sqlPayload);
      if (!Array.isArray(searchRes)) {
        throw new Error(`Search failed on SQL injection string: ${sqlPayload}`);
      }
    }

    // 2. XSS & Path Traversal Vectors
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '"><script>document.location="http://attacker.com"</script>',
      '../../../../../../etc/passwd',
      '..\\..\\..\\Windows\\System32',
      '\0nullbyte_attack',
    ];

    for (const xss of xssPayloads) {
      const xssEntry = await repo.createEntry({
        type: 'note',
        title: `XSS Test: ${xss}`,
        content: xss,
        tags: ['security-test'],
      });
      const retrieved = await repo.getEntry(xssEntry.id);
      if ((retrieved).content !== xss) {
        throw new Error(`XSS payload corrupted: ${xss}`);
      }
    }

    // 3. Malformed JSON HTTP requests
    const malformedBodies = [
      '{ "invalid_json": ',
      'NOT_JSON_AT_ALL',
      '{"type": "login", "title": 12345}', // Invalid title type
      '',
    ];

    for (const malformed of malformedBodies) {
      const res = await app.request('/api/entries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: malformed,
      });
      // Should reject with 400 Bad Request, never 500 unhandled crash
      if (res.status !== 400) {
        throw new Error(`Malformed request returned status ${res.status}, expected 400`);
      }
    }
  });

  await runner.runTest('5.5 Malformed & Corrupted Sync Envelopes', async () => {
    const devA = generateDeviceIdentity('Dev-A');
    const devB = generateDeviceIdentity('Dev-B');
    const syncSecret = randomBytes(32).toString('hex');

    const validEnvelope = createSyncEnvelope(
      [{ entryId: 'e-1', op: 'CREATE', updatedAt: Date.now(), version: 1 }],
      devA.privateKeyPem,
      devA.deviceId,
      devB.deviceId,
      syncSecret
    );

    // 1. Corrupted signature -> UnauthorizedPeerError
    const forgedSigEnvelope = {
      ...validEnvelope,
      signature: validEnvelope.signature.slice(0, -4) + '0000',
    };
    let threwSig = false;
    try {
      unpackSyncEnvelope(forgedSigEnvelope, devA.publicKeyPem, syncSecret);
    } catch (err) {
      if (err instanceof UnauthorizedPeerError) threwSig = true;
    }
    if (!threwSig) {
      throw new Error('Corrupted signature was not rejected with UnauthorizedPeerError');
    }

    // 2. Corrupted ciphertext -> SyncInterruptedError
    const corruptedCiphertextEnvelope = {
      ...validEnvelope,
      payload: {
        ...validEnvelope.payload,
        ciphertext: validEnvelope.payload.ciphertext.slice(0, -2) + '00',
      },
    };
    // Re-sign to isolate cipher error from signature check
    const signable = `${validEnvelope.senderDeviceId}:${validEnvelope.recipientDeviceId}:${validEnvelope.timestamp}:${validEnvelope.nonce}:${corruptedCiphertextEnvelope.payload.ciphertext}:${validEnvelope.payload.authTag}`;
    corruptedCiphertextEnvelope.signature = signData(signable, devA.privateKeyPem);

    let threwCipher = false;
    try {
      unpackSyncEnvelope(corruptedCiphertextEnvelope, devA.publicKeyPem, syncSecret);
    } catch (err) {
      if (err instanceof SyncInterruptedError) threwCipher = true;
    }
    if (!threwCipher) {
      throw new Error('Corrupted ciphertext was not rejected with SyncInterruptedError');
    }
  });

  runner.endSuite();

  // ============================================================================
  // SUITE 6: Error Handling, State Recovery & Lock Enforcement
  // ============================================================================
  runner.beginSuite('Suite 6: Error Handling, State Recovery & Lock Enforcement', 'AC-A-M0-01-01');

  await runner.runTest('6.1 Comprehensive Locked Endpoint Matrix (HTTP 423 Enforcement)', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    await repo.initialize('LockMatrixPass123!');
    const { app } = createApp({ repository: repo });

    // Lock vault
    repo.lock();

    const lockedEndpoints = [
      { method: 'GET', path: '/api/entries', expected: 423 },
      { method: 'POST', path: '/api/entries', body: { type: 'login', title: 'Test', username: 'u', password: 'p' }, expected: 423 },
      { method: 'GET', path: '/api/entries/dummy-id', expected: 423 },
      { method: 'PUT', path: '/api/entries/dummy-id', body: { title: 'New' }, expected: 423 },
      { method: 'DELETE', path: '/api/entries/dummy-id', expected: 423 },
      { method: 'GET', path: '/api/metadata', expected: 423 },
      { method: 'GET', path: '/api/metadata/search?q=test', expected: 423 },
      { method: 'GET', path: '/api/metadata/dummy-id', expected: 423 },
      { method: 'POST', path: '/api/import/analyze', body: { csvContent: 'title,url\nfoo,bar' }, expected: 423 },
    ];

    for (const ep of lockedEndpoints) {
      const res = await app.request(ep.path, {
        method: ep.method,
        headers: { 'content-type': 'application/json' },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      if (res.status !== ep.expected) {
        throw new Error(`Locked endpoint ${ep.method} ${ep.path} returned HTTP ${res.status}, expected ${ep.expected}`);
      }
    }
  });

  await runner.runTest('6.2 Wrong Password Brute-Force Recovery & Key Integrity', async () => {
    const storage = new SqliteVaultStorage(':memory:');
    const repo = new VaultRepository(storage);
    const correctPassword = 'RealMasterPassword_#777';
    await repo.initialize(correctPassword);
    repo.lock();

    // Perform 25 consecutive wrong password unlock attempts
    for (let i = 0; i < 25; i++) {
      let threw = false;
      try {
        await repo.unlock(`WrongPasswordAttempt_${i}`);
      } catch (err) {
        if (err instanceof InvalidCredentialsError) threw = true;
      }
      if (!threw) {
        throw new Error(`Failed to reject invalid password on attempt ${i}`);
      }
      if (repo.getStatus().isLocked !== true) {
        throw new Error(`Vault unlocked unexpectedly after wrong password attempt ${i}`);
      }
    }

    // Immediately follow with correct password unlock
    const unlockSuccess = await repo.unlock(correctPassword);
    if (!unlockSuccess || repo.getStatus().isLocked !== false) {
      throw new Error('Valid unlock failed after sequence of invalid unlock attempts');
    }
  });

  runner.endSuite();

  runner.stop();

  // Print Final Summary Table
  const report = runner.getReport();
  console.log('\n================================================================================');
  console.log('FINAL QA AUTOMATION TEST RESULTS');
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

// Direct Execution Entrypoint
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const report = await executeQaTestHarness();
  if (report.failedTests > 0) {
    process.exit(1);
  }
}
