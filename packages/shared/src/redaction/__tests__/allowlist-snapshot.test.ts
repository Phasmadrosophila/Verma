/**
 * AC-B-M1-01-03: Allowlist Snapshot Tests
 *
 * Verifies:
 * - Only approved metadata fields are present in the projected view.
 * - Exact schema matching for title, domain, tags, timestamps, strength/reuse flags,
 *   import labels, and conflict metadata.
 * - No extra or unapproved properties exist.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { projectEntryMetadata, projectVaultEntries } from '../projection.js';
import { ALLOWED_METADATA_KEYS, ALLOWED_CONFLICT_METADATA_KEYS } from '../constants.js';
import { VaultEntry } from '../../types/index.js';

describe('AC-B-M1-01-03: Allowlist Metadata Projection Snapshot Tests', () => {
  it('matches the exact allowlisted metadata structure for a complete login entry', () => {
    const rawEntry: VaultEntry = {
      id: 'entry-uuid-login-1',
      title: 'GitHub Enterprise Account',
      entryType: 'login',
      domain: 'github.com',
      tags: ['work', 'infrastructure'],
      createdAt: 1700000000000,
      updatedAt: 1700000500000,
      lastUsedAt: 1700000800000,
      isWeak: false,
      isReused: true,
      strengthScore: 88,
      importSource: 'bitwarden_csv',
      fieldLabels: ['username', 'email', 'backup_phone'],
      conflictMetadata: {
        hasConflict: true,
        conflictingVersion: 4,
        remoteDeviceId: 'device-peer-node-1',
        conflictFieldNames: ['tags', 'updatedAt'],
        baseUpdatedAt: 1700000200000,
        remoteUpdatedAt: 1700000500000,
        conflictingPayload: {
          password: 'SecretLeakedPasswordShouldBeIgnored',
        },
      },
      // Denied secret fields
      password: 'TopSecretMasterPassword123!',
      totpSeed: 'JBSWY3DPEHPK3PXP',
      recoveryCodes: ['REC-1', 'REC-2'],
      noteBody: 'Admin notes with security codes',
    };

    const projected = projectEntryMetadata(rawEntry, true);
    assert.ok(projected);

    // Expected exact snapshot
    const expectedSnapshot = {
      id: 'entry-uuid-login-1',
      title: 'GitHub Enterprise Account',
      entryType: 'login',
      domain: 'github.com',
      tags: ['work', 'infrastructure'],
      createdAt: 1700000000000,
      updatedAt: 1700000500000,
      lastUsedAt: 1700000800000,
      isWeak: false,
      isReused: true,
      strengthScore: 88,
      importSource: 'bitwarden_csv',
      fieldLabels: ['username', 'email', 'backup_phone'],
      conflictMetadata: {
        hasConflict: true,
        conflictingVersion: 4,
        remoteDeviceId: 'device-peer-node-1',
        conflictFieldNames: ['tags', 'updatedAt'],
        baseUpdatedAt: 1700000200000,
        remoteUpdatedAt: 1700000500000,
      },
    };

    assert.deepEqual(projected, expectedSnapshot);

    // Check every key in projected object is explicitly in ALLOWED_METADATA_KEYS
    for (const key of Object.keys(projected)) {
      assert.ok(
        ALLOWED_METADATA_KEYS.has(key),
        `Unexpected key '${key}' not in ALLOWED_METADATA_KEYS`
      );
    }

    // Check conflict metadata keys
    assert.ok(projected.conflictMetadata);
    for (const key of Object.keys(projected.conflictMetadata)) {
      assert.ok(
        ALLOWED_CONFLICT_METADATA_KEYS.has(key),
        `Unexpected key '${key}' not in ALLOWED_CONFLICT_METADATA_KEYS`
      );
    }
  });

  it('matches allowlist snapshot for an API key entry', () => {
    const rawEntry: VaultEntry = {
      id: 'entry-api-openai',
      title: 'OpenAI Dev Key',
      entryType: 'api_key',
      domain: 'openai.com',
      tags: ['ai', 'development'],
      createdAt: 1700000100000,
      updatedAt: 1700000200000,
      isWeak: false,
      isReused: false,
      strengthScore: 99,
      secretValue: 'mock_openai_api_secret_key_987654321',
    };

    const projected = projectEntryMetadata(rawEntry, true);
    assert.ok(projected);

    const expectedSnapshot = {
      id: 'entry-api-openai',
      title: 'OpenAI Dev Key',
      entryType: 'api_key',
      domain: 'openai.com',
      tags: ['ai', 'development'],
      createdAt: 1700000100000,
      updatedAt: 1700000200000,
      isWeak: false,
      isReused: false,
      strengthScore: 99,
      fieldLabels: [],
    };

    assert.deepEqual(projected, expectedSnapshot);
  });

  it('matches allowlist snapshot for a minimal note entry', () => {
    const rawEntry: VaultEntry = {
      id: 'entry-note-server-rack',
      title: 'Server Rack Dimensions & Specs',
      entryType: 'note',
      tags: ['hardware'],
      createdAt: 1700000300000,
      updatedAt: 1700000400000,
      noteBody: 'Rack height is 42U, depth is 1000mm, location: Datacenter A',
    };

    const projected = projectEntryMetadata(rawEntry, true);
    assert.ok(projected);

    const expectedSnapshot = {
      id: 'entry-note-server-rack',
      title: 'Server Rack Dimensions & Specs',
      entryType: 'note',
      tags: ['hardware'],
      createdAt: 1700000300000,
      updatedAt: 1700000400000,
      isWeak: false,
      isReused: false,
      fieldLabels: [],
    };

    assert.deepEqual(projected, expectedSnapshot);
  });

  it('produces an immutable (frozen) projection structure', () => {
    const rawEntry: VaultEntry = {
      id: 'entry-frozen-test',
      title: 'Test Freeze Entry',
      entryType: 'login',
      tags: ['test'],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    const projected = projectEntryMetadata(rawEntry, true);
    assert.ok(projected);
    assert.ok(Object.isFrozen(projected));
    assert.ok(Object.isFrozen(projected.tags));
    assert.ok(Object.isFrozen(projected.fieldLabels));

    const batch = projectVaultEntries([rawEntry], true);
    assert.ok(Object.isFrozen(batch));
    assert.ok(Object.isFrozen(batch.entries));
  });
});
