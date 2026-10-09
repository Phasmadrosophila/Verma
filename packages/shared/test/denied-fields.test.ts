import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toRedactedMetadata,
  projectEntriesMetadata,
  assertSafeMetadata,
  DENIED_SECRET_FIELD_KEYS,
  EXCLUDED_AI_ENTRY_TYPES,
  isExcludedFromAi,
} from '../src/redaction/index.js';
import { ALL_SYNTHETIC_ENTRIES } from '../src/fixtures/synthetic-data.js';
import type { LoginEntry, NoteEntry, ApiKeyEntry, VaultEntry } from '../src/types/entry.js';

describe('AC-B-M1-01-02: Denied-Field Property Tests (Zero Secret Exposure & Crypto Exclusion)', () => {
  it('should exclude every denied secret field from metadata projections across all synthetic fixtures', () => {
    const projectedList = projectEntriesMetadata(ALL_SYNTHETIC_ENTRIES);

    assert.ok(projectedList.length > 0);

    for (const item of projectedList) {
      // 1. Verify no denied secret field exists as an object key
      for (const deniedKey of DENIED_SECRET_FIELD_KEYS) {
        assert.equal(
          (item as any)[deniedKey],
          undefined,
          `Metadata item ${item.id} must not contain denied key: "${deniedKey}"`
        );
      }

      // 2. Verify type is not an excluded crypto wallet type
      assert.ok(
        !isExcludedFromAi(item),
        `Projected metadata must never have excluded crypto type: ${item.type}`
      );
    }
  });

  it('should guarantee no secret substring values leak into projected metadata', () => {
    for (const rawEntry of ALL_SYNTHETIC_ENTRIES) {
      const projected = toRedactedMetadata(rawEntry);
      if (!projected) continue;

      const safety = assertSafeMetadata(projected, rawEntry);
      assert.equal(
        safety.isSafe,
        true,
        `Entry ${rawEntry.id} had safety violations: ${safety.violations.join(', ')}`
      );

      const serialized = JSON.stringify(projected);

      if (rawEntry.type === 'login') {
        const login = rawEntry as LoginEntry;
        if (login.password) {
          assert.ok(!serialized.includes(login.password), 'Password leaked into metadata');
        }
        if (login.totpSecret) {
          assert.ok(!serialized.includes(login.totpSecret), 'TOTP secret leaked into metadata');
        }
        if (login.recoveryCodes) {
          for (const code of login.recoveryCodes) {
            assert.ok(!serialized.includes(code), 'Recovery code leaked into metadata');
          }
        }
      } else if (rawEntry.type === 'note') {
        const note = rawEntry as NoteEntry;
        if (note.content) {
          assert.ok(!serialized.includes(note.content), 'Note body leaked into metadata');
        }
      } else if (rawEntry.type === 'api_key') {
        const apiKey = rawEntry as ApiKeyEntry;
        if (apiKey.apiKey) {
          assert.ok(!serialized.includes(apiKey.apiKey), 'API key leaked into metadata');
        }
        if (apiKey.apiSecret) {
          assert.ok(!serialized.includes(apiKey.apiSecret), 'API secret leaked into metadata');
        }
      }
    }
  });

  it('should completely exclude crypto wallet entries from AI metadata projections', () => {
    const cryptoEntry = {
      id: 'wallet-001',
      type: 'crypto_wallet',
      title: 'MetaMask Ethereum Vault',
      seedPhrase: 'twelve secret mnemonic seed words for crypto wallet recovery phrase',
      walletAddress: '0x71C8fb86633665c8f083d10207c808B0',
      privateKey: '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      tags: ['crypto', 'eth'],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    } as unknown as VaultEntry;

    assert.equal(isExcludedFromAi(cryptoEntry), true);

    const projected = toRedactedMetadata(cryptoEntry);
    assert.equal(projected, null, 'Crypto wallet entries must project to null');

    const batch = [cryptoEntry, ...ALL_SYNTHETIC_ENTRIES];
    const batchProjected = projectEntriesMetadata(batch);

    // Verify crypto entry is omitted from batch
    assert.ok(!batchProjected.some((p) => p.id === 'wallet-001'));
    assert.ok(!batchProjected.some((p) => p.title === 'MetaMask Ethereum Vault'));
  });
});
