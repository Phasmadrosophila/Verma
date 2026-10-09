/**
 * AC-B-M1-01-01: Trusted-layer boundary test with a fake model adapter.
 *
 * Verifies:
 * - Redaction runs strictly in the trusted application layer before inference.
 * - The model adapter receives ONLY allowlisted metadata projections.
 * - Raw entries and secret fields never reach model adapter.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TrustedRedactionBoundary,
  SimpleVaultLockProvider,
} from '../boundary.js';
import { FakeLocalAIAdapter } from '../../ai/fake-adapter.js';
import { VaultEntry } from '../../types/index.js';

describe('AC-B-M1-01-01: Trusted Redaction Boundary & Model Adapter Isolation', () => {
  const sampleEntries: VaultEntry[] = [
    {
      id: 'entry-login-1',
      title: 'Company Google Workspace',
      entryType: 'login',
      domain: 'google.com',
      tags: ['work', 'email'],
      createdAt: 1700000000000,
      updatedAt: 1700000500000,
      isWeak: false,
      isReused: false,
      strengthScore: 92,
      // Denied secret fields
      password: 'ExtremelySecretPassword!9876',
      totpSeed: 'JBSWY3DPEHPK3PXP',
      noteBody: 'Contains private recovery codes in note',
      recoveryCodes: ['REC-1111', 'REC-2222'],
    },
    {
      id: 'entry-api-1',
      title: 'Production Stripe API Key',
      entryType: 'api_key',
      domain: 'stripe.com',
      tags: ['prod', 'billing'],
      createdAt: 1700000100000,
      updatedAt: 1700000600000,
      // Denied secret fields
      secretValue: 'mock_stripe_secret_key_value_987654321',
    },
    {
      id: 'entry-crypto-1',
      title: 'Ledger ETH Vault',
      entryType: 'crypto_wallet',
      tags: ['crypto'],
      createdAt: 1700000200000,
      updatedAt: 1700000700000,
      // Denied crypto wallet data
      walletAddress: '0x71C8342fc2829156656437BbB727719c374F8ab7',
      seedPhrase: 'twelve secret words recovery phrase test seed ledger secure',
      privateKey: '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    },
  ];

  it('runs redaction in trusted layer and dispatches only redacted projection to model adapter', async () => {
    const lockProvider = new SimpleVaultLockProvider(true);
    const boundary = new TrustedRedactionBoundary(lockProvider);
    const fakeAdapter = new FakeLocalAIAdapter<{ query: string; entries: unknown }, { answer: string }>({
      cannedResponse: { answer: 'Found 1 work Google account' },
    });

    const secretCanaries = [
      'ExtremelySecretPassword!9876',
      'JBSWY3DPEHPK3PXP',
      'Contains private recovery codes in note',
      'REC-1111',
      'mock_stripe_secret_key_value_987654321',
      '0x71C8342fc2829156656437BbB727719c374F8ab7',
      'twelve secret words recovery phrase test seed ledger secure',
      '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    ];

    const result = await boundary.invokeModel(
      fakeAdapter,
      (projection) => ({
        query: 'find google login',
        entries: projection.entries,
      }),
      sampleEntries
    );

    // Verify inference succeeded
    assert.deepEqual(result, { answer: 'Found 1 work Google account' });

    // Verify fake model adapter received exactly 1 call
    assert.equal(fakeAdapter.getCallCount(), 1);

    const receivedCall = fakeAdapter.getLastInput();
    assert.ok(receivedCall);
    assert.equal(receivedCall.query, 'find google login');

    // Verify model input only received 2 non-crypto entries (crypto entry excluded)
    const receivedEntries = receivedCall.entries as Array<{ id: string; title: string }>;
    assert.equal(receivedEntries.length, 2);
    assert.equal(receivedEntries[0].id, 'entry-login-1');
    assert.equal(receivedEntries[0].title, 'Company Google Workspace');
    assert.equal(receivedEntries[1].id, 'entry-api-1');
    assert.equal(receivedEntries[1].title, 'Production Stripe API Key');

    // Assert zero secret string exposure in adapter history
    fakeAdapter.assertZeroSecretExposure(secretCanaries);
  });

  it('provides safe search context without exposing secrets', () => {
    const lockProvider = new SimpleVaultLockProvider(true);
    const boundary = new TrustedRedactionBoundary(lockProvider);

    const searchContext = boundary.prepareSearchContext('my work google', sampleEntries);
    assert.equal(searchContext.query, 'my work google');
    assert.equal(searchContext.vaultUnlocked, true);
    assert.equal(searchContext.entries.length, 2); // Excludes crypto wallet

    const serialized = JSON.stringify(searchContext);
    assert.ok(!serialized.includes('ExtremelySecretPassword'));
    assert.ok(!serialized.includes('mock_stripe_secret_key_value'));
    assert.ok(!serialized.includes('Ledger ETH'));
  });

  it('provides safe smart import context stripping cell values and keeping only headers', () => {
    const lockProvider = new SimpleVaultLockProvider(true);
    const boundary = new TrustedRedactionBoundary(lockProvider);

    const importContext = boundary.prepareImportContext(
      'chrome_csv',
      [
        {
          tempId: 'row-1',
          suggestedTitle: 'Amazon Store',
          domain: 'amazon.com',
          headers: ['name', 'url', 'username', 'password', 'note'],
          suggestedTags: ['shopping'],
          isLikelyDuplicate: false,
        },
      ],
      sampleEntries
    );

    assert.equal(importContext.importSource, 'chrome_csv');
    assert.equal(importContext.records.length, 1);
    const record = importContext.records[0];
    assert.equal(record.suggestedTitle, 'Amazon Store');
    assert.equal(record.domain, 'amazon.com');
    // Secret header 'password' and 'note' must be filtered from detectedHeaders
    assert.deepEqual(record.detectedHeaders, ['name', 'url', 'username']);
    assert.deepEqual(record.suggestedTags, ['shopping']);
  });

  it('provides safe tagging context over existing metadata', () => {
    const lockProvider = new SimpleVaultLockProvider(true);
    const boundary = new TrustedRedactionBoundary(lockProvider);

    const taggingContext = boundary.prepareTaggingContext(sampleEntries);
    assert.equal(taggingContext.entries.length, 2);
    assert.deepEqual(taggingContext.existingTags, ['billing', 'email', 'prod', 'work']);
  });

  it('provides safe conflict context over competing entries', () => {
    const lockProvider = new SimpleVaultLockProvider(true);
    const boundary = new TrustedRedactionBoundary(lockProvider);

    const conflictingEntries: VaultEntry[] = [
      {
        id: 'entry-conflicted',
        title: 'GitLab Account',
        entryType: 'login',
        domain: 'gitlab.com',
        tags: ['dev'],
        createdAt: 1700000000000,
        updatedAt: 1700000500000,
        password: 'RawPasswordShouldBeHidden',
        conflictMetadata: {
          hasConflict: true,
          conflictingVersion: 3,
          remoteDeviceId: 'device-xyz',
          conflictFieldNames: ['tags', 'updatedAt'],
          baseUpdatedAt: 1700000100000,
          remoteUpdatedAt: 1700000500000,
          conflictingPayload: {
            password: 'LeakedConflictingPassword',
          },
        },
      },
    ];

    const conflictContext = boundary.prepareConflictContext(conflictingEntries);
    assert.equal(conflictContext.conflicts.length, 1);
    const item = conflictContext.conflicts[0];
    assert.equal(item.id, 'entry-conflicted');
    assert.equal(item.title, 'GitLab Account');
    assert.equal(item.conflict.hasConflict, true);
    assert.equal(item.conflict.remoteDeviceId, 'device-xyz');
    assert.deepEqual(item.conflict.conflictFieldNames, ['tags', 'updatedAt']);

    const serialized = JSON.stringify(conflictContext);
    assert.ok(!serialized.includes('RawPasswordShouldBeHidden'));
    assert.ok(!serialized.includes('LeakedConflictingPassword'));
    assert.ok(!serialized.includes('conflictingPayload'));
  });
});
