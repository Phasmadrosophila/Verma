/**
 * AC-B-M1-01-02: Denied-Field Property Tests
 *
 * Exhaustively tests synthetic entries to verify:
 * - Passwords, TOTP seeds, recovery codes, seed phrases, private keys, secret values,
 *   note bodies, file contents, vault keys, and crypto wallet metadata NEVER reach projected output.
 * - Crypto wallet entries (regardless of title) are completely excluded (count = 0).
 * - Property tests iterate over randomized/permutated synthetic entries.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { projectEntryMetadata, projectVaultEntries } from '../projection.js';
import { DENIED_SECRET_FIELD_NAMES } from '../constants.js';
import { VaultEntry } from '../../types/index.js';

describe('AC-B-M1-01-02: Denied Secret Fields & Crypto Exclusion Property Tests', () => {
  const secretCanaries: string[] = [];

  function generateCanary(prefix: string): string {
    const canary = `CANARY_${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    secretCanaries.push(canary);
    return canary;
  }

  function createSyntheticEntry(index: number, entryType: string): { entry: VaultEntry; canaries: string[] } {
    const localCanaries: string[] = [];
    const pw = generateCanary(`PW_${index}`);
    const totp = generateCanary(`TOTP_${index}`);
    const recCode1 = generateCanary(`REC1_${index}`);
    const recCode2 = generateCanary(`REC2_${index}`);
    const secVal = generateCanary(`SECVAL_${index}`);
    const noteText = generateCanary(`NOTE_${index}`);
    const fileBytes = generateCanary(`FILE_${index}`);
    const masterKey = generateCanary(`MASTER_${index}`);
    const customSecVal = generateCanary(`CUSTVAL_${index}`);

    localCanaries.push(
      pw,
      totp,
      recCode1,
      recCode2,
      secVal,
      noteText,
      fileBytes,
      masterKey,
      customSecVal
    );

    const isCrypto =
      entryType.toLowerCase().includes('crypto') ||
      entryType.toLowerCase().includes('wallet') ||
      entryType.toLowerCase().includes('seed_phrase') ||
      entryType.toLowerCase().includes('private_key');

    const entry: VaultEntry = {
      id: `synthetic-${index}`,
      title: `Service #${index} [${entryType}]`,
      entryType,
      domain: `service-${index}.example.com`,
      tags: [`tag-${index % 5}`, 'synthetic'],
      createdAt: 1700000000000 + index * 1000,
      updatedAt: 1700000100000 + index * 1000,
      lastUsedAt: 1700000200000 + index * 1000,
      isWeak: index % 2 === 0,
      isReused: index % 3 === 0,
      strengthScore: (index * 17) % 100,
      importSource: 'synthetic_generator',
      fieldLabels: ['username', 'api_endpoint', 'custom_label'],

      // Denied fields injected into every synthetic entry
      password: pw,
      totpSeed: totp,
      totpToken: '123456',
      recoveryCodes: [recCode1, recCode2],
      recoveryPhrase: 'twenty four secret words phrase test recovery phrase',
      secretValue: secVal,
      noteBody: noteText,
      fileContents: fileBytes,
      attachments: [
        {
          name: 'secret-document.pdf',
          size: 1024,
          content: fileBytes,
        },
      ],
      vaultMasterKey: masterKey,
      customFields: [
        { label: 'account_number', value: '12345678', isSecret: false },
        { label: 'secret_pin', value: customSecVal, isSecret: true },
      ],
    };

    if (isCrypto) {
      const seed = generateCanary(`SEED_${index}`);
      const privKey = generateCanary(`PRIVKEY_${index}`);
      const walletAddr = generateCanary(`WALLET_${index}`);
      localCanaries.push(seed, privKey, walletAddr);

      entry.cryptoWallet = {
        walletAddress: walletAddr,
        network: 'ethereum',
        derivationPath: "m/44'/60'/0'/0/0",
        seedPhrase: seed,
        privateKey: privKey,
      };
      entry.walletAddress = walletAddr;
      entry.seedPhrase = seed;
      entry.privateKey = privKey;
    }

    return { entry, canaries: localCanaries };
  }

  it('never contains any denied field name in projected keys across synthetic entry types', () => {
    const entryTypes = ['login', 'note', 'api_key', 'card', 'identity', 'server'];

    for (let i = 0; i < 50; i++) {
      const type = entryTypes[i % entryTypes.length];
      const { entry, canaries } = createSyntheticEntry(i, type);

      const projected = projectEntryMetadata(entry, true);
      assert.ok(projected, `Expected non-crypto entry of type ${type} to be projected`);

      const projectedKeys = Object.keys(projected);

      // Assert no denied field name is present in top-level keys
      for (const deniedKey of DENIED_SECRET_FIELD_NAMES) {
        assert.ok(
          !projectedKeys.includes(deniedKey),
          `Security violation: Denied key '${deniedKey}' was found on projected entry keys`
        );
      }

      // Assert no canary secret value is present anywhere in the serialized projection
      const serialized = JSON.stringify(projected);
      for (const canary of canaries) {
        assert.ok(
          !serialized.includes(canary),
          `Security violation: Canary secret value was leaked in projected JSON: '${canary}'`
        );
      }
    }
  });

  it('completely excludes all crypto wallet entry variations from projection (count = 0)', () => {
    const cryptoTypes = [
      'crypto_wallet',
      'crypto',
      'cryptocurrency',
      'wallet',
      'seed_phrase',
      'private_key',
      'web3_wallet',
      'hardware_wallet',
      'Crypto_Wallet',
      'CRYPTO',
    ];

    for (let i = 0; i < cryptoTypes.length; i++) {
      const type = cryptoTypes[i];
      const { entry } = createSyntheticEntry(i + 100, type);

      const projected = projectEntryMetadata(entry, true);
      assert.equal(
        projected,
        null,
        `Expected crypto wallet entry of type '${type}' to be completely excluded (null)`
      );
    }
  });

  it('excludes crypto wallet entries even when title or entryType is disguised', () => {
    const disguisedEntries: VaultEntry[] = [
      {
        id: 'disguised-1',
        title: 'Normal Looking Login Title',
        entryType: 'login',
        tags: ['work'],
        createdAt: 1700000000000,
        updatedAt: 1700000100000,
        cryptoWallet: {
          walletAddress: '0x1234567890123456789012345678901234567890',
        },
      },
      {
        id: 'disguised-2',
        title: 'My General Note',
        entryType: 'note',
        tags: ['notes'],
        createdAt: 1700000000000,
        updatedAt: 1700000100000,
        walletAddress: '0x9876543210987654321098765432109876543210',
      },
      {
        id: 'disguised-3',
        title: 'API Server',
        entryType: 'api_key',
        tags: ['api'],
        createdAt: 1700000000000,
        updatedAt: 1700000100000,
        seedPhrase: 'twelve words recovery seed phrase stored in api entry',
      },
    ];

    for (const disguised of disguisedEntries) {
      const projected = projectEntryMetadata(disguised, true);
      assert.equal(
        projected,
        null,
        `Expected disguised crypto entry '${disguised.id}' to be filtered out`
      );
    }

    const batchProjection = projectVaultEntries(disguisedEntries, true);
    assert.equal(batchProjection.totalEntries, 0);
    assert.equal(batchProjection.entries.length, 0);
  });

  it('strips custom field secret values while preserving allowed field labels', () => {
    const entry: VaultEntry = {
      id: 'custom-fields-entry',
      title: 'Database Cluster',
      entryType: 'login',
      tags: ['db', 'infra'],
      createdAt: 1700000000000,
      updatedAt: 1700000100000,
      customFields: [
        { label: 'port', value: '5432', isSecret: false },
        { label: 'database_name', value: 'production_db', isSecret: false },
        { label: 'root_password', value: 'SUPER_SECRET_ROOT_PW', isSecret: true },
        { label: 'admin_token', value: 'SECRET_BEARER_TOKEN', isSecret: true },
      ],
    };

    const projected = projectEntryMetadata(entry, true);
    assert.ok(projected);

    // Labels are extracted (excluding denied names like 'password' if matched)
    assert.ok(projected.fieldLabels.includes('port'));
    assert.ok(projected.fieldLabels.includes('database_name'));
    assert.ok(projected.fieldLabels.includes('admin_token'));

    const serialized = JSON.stringify(projected);
    // Secret values MUST NOT appear
    assert.ok(!serialized.includes('SUPER_SECRET_ROOT_PW'));
    assert.ok(!serialized.includes('SECRET_BEARER_TOKEN'));
    // Non-secret custom field values MUST ALSO NOT appear (only labels are projected)
    assert.ok(!serialized.includes('5432'));
    assert.ok(!serialized.includes('production_db'));
  });

  it('ensures note bodies are never projected for note entry types', () => {
    const noteEntry: VaultEntry = {
      id: 'secure-note-1',
      title: 'Wifi Passwords and Gate Codes',
      entryType: 'note',
      tags: ['home', 'wifi'],
      createdAt: 1700000000000,
      updatedAt: 1700000100000,
      noteBody: 'The front gate code is #4492 and Wi-Fi password is GuestWifi2026!',
    };

    const projected = projectEntryMetadata(noteEntry, true);
    assert.ok(projected);
    assert.equal(projected.id, 'secure-note-1');
    assert.equal(projected.title, 'Wifi Passwords and Gate Codes');
    assert.equal(projected.entryType, 'note');
    assert.deepEqual(projected.tags, ['home', 'wifi']);

    const serialized = JSON.stringify(projected);
    assert.ok(!serialized.includes('4492'));
    assert.ok(!serialized.includes('GuestWifi2026'));
    assert.ok(!serialized.includes('front gate code'));
  });
});
