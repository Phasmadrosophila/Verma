import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toRedactedMetadata,
  projectEntriesMetadata,
  assertSafeMetadata,
  DENIED_SECRET_FIELD_KEYS,
} from '../src/redaction/projection.js';
import type { LoginEntry, NoteEntry, ApiKeyEntry } from '../src/types/entry.js';

describe('Redaction & Metadata Projection Engine', () => {
  const sampleLogin: LoginEntry = {
    id: 'login-123',
    type: 'login',
    title: 'Acme Corp Portal',
    username: 'alice@acme.corp',
    password: 'SuperSecretPassword123!#',
    url: 'https://auth.acme.corp/login',
    domain: 'auth.acme.corp',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    recoveryCodes: ['REC-001', 'REC-002'],
    tags: ['work', 'sso'],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  const sampleNote: NoteEntry = {
    id: 'note-456',
    type: 'note',
    title: 'Secret Server Notes',
    content: 'Top secret server credentials and internal infrastructure details.',
    category: 'infra',
    tags: ['servers', 'infra'],
    createdAt: 1700000100000,
    updatedAt: 1700000100000,
  };

  const sampleApiKey: ApiKeyEntry = {
    id: 'api-789',
    type: 'api_key',
    title: 'Production Payment Gateway',
    service: 'stripe',
    apiKey: 'sk_live_very_secret_api_key_value_99999',
    apiSecret: 'whsec_very_secret_webhook_signing_secret_88888',
    keyId: 'key_prod_01',
    tags: ['billing', 'prod'],
    createdAt: 1700000200000,
    updatedAt: 1700000200000,
  };

  it('should project login entry metadata without exposing secrets', () => {
    const metadata = toRedactedMetadata(sampleLogin);

    assert.equal(metadata.id, sampleLogin.id);
    assert.equal(metadata.type, 'login');
    assert.equal(metadata.title, sampleLogin.title);
    assert.equal(metadata.domain, 'auth.acme.corp');
    assert.deepEqual(metadata.tags, ['work', 'sso']);
    assert.ok(Array.isArray(metadata.fieldLabels));
    assert.ok(metadata.fieldLabels.includes('username'));
    assert.ok(metadata.fieldLabels.includes('password'));

    // Invariant check: no denied fields exist as keys
    for (const denied of DENIED_SECRET_FIELD_KEYS) {
      assert.equal((metadata as any)[denied], undefined, `Metadata must not have property "${denied}"`);
    }

    // Invariant check: no secret values appear in JSON serialization
    const json = JSON.stringify(metadata);
    assert.ok(!json.includes(sampleLogin.password), 'Password value must not appear in metadata');
    assert.ok(!json.includes(sampleLogin.totpSecret!), 'TOTP secret must not appear in metadata');
    assert.ok(!json.includes('REC-001'), 'Recovery code must not appear in metadata');

    const safetyCheck = assertSafeMetadata(metadata, sampleLogin);
    assert.equal(safetyCheck.isSafe, true);
    assert.equal(safetyCheck.violations.length, 0);
  });

  it('should project note entry metadata without exposing note content', () => {
    const metadata = toRedactedMetadata(sampleNote);

    assert.equal(metadata.id, sampleNote.id);
    assert.equal(metadata.type, 'note');
    assert.equal(metadata.title, sampleNote.title);
    assert.deepEqual(metadata.tags, ['servers', 'infra']);

    const json = JSON.stringify(metadata);
    assert.ok(!json.includes(sampleNote.content), 'Note content must not appear in metadata');
    assert.equal((metadata as any).content, undefined);

    const safetyCheck = assertSafeMetadata(metadata, sampleNote);
    assert.equal(safetyCheck.isSafe, true);
  });

  it('should project api key entry metadata without exposing apiKey or apiSecret', () => {
    const metadata = toRedactedMetadata(sampleApiKey);

    assert.equal(metadata.id, sampleApiKey.id);
    assert.equal(metadata.type, 'api_key');
    assert.equal(metadata.title, sampleApiKey.title);
    assert.equal(metadata.domain, 'stripe');

    const json = JSON.stringify(metadata);
    assert.ok(!json.includes(sampleApiKey.apiKey), 'apiKey value must not appear in metadata');
    assert.ok(!json.includes(sampleApiKey.apiSecret!), 'apiSecret value must not appear in metadata');
    assert.equal((metadata as any).apiKey, undefined);
    assert.equal((metadata as any).apiSecret, undefined);

    const safetyCheck = assertSafeMetadata(metadata, sampleApiKey);
    assert.equal(safetyCheck.isSafe, true);
  });

  it('should correctly project a batch of mixed entries with deterministic reuse flags', () => {
    const duplicateLogin: LoginEntry = {
      ...sampleLogin,
      id: 'login-dup',
      title: 'Secondary Acme Account',
    };

    const batch = [sampleLogin, duplicateLogin, sampleNote, sampleApiKey];
    const projected = projectEntriesMetadata(batch);

    assert.equal(projected.length, 4);
    assert.equal(projected[0].isReused, true);
    assert.equal(projected[1].isReused, true);
    assert.equal(projected[2].isReused, false);
    assert.equal(projected[3].isReused, false);
  });
});
