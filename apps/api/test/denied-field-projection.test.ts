import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { VaultRepository } from '../src/repository/vault-repository.js';
import { DENIED_SECRET_FIELD_KEYS } from '@app/shared';
import type { LoginEntry, NoteEntry, ApiKeyEntry } from '@app/shared';

describe('AC-A-M0-01-03: Denied-Field Projection Test Covering Passwords, Note Bodies, API Keys, Recovery Data, and Vault Keys', () => {
  let repo: VaultRepository;
  const masterPassword = 'MasterPasswordForProjectionTest2026!';

  beforeEach(async () => {
    repo = new VaultRepository();
    await repo.initialize(masterPassword);
  });

  it('should project metadata containing only allowlisted fields and strictly zero secrets', async () => {
    // Seed one of each entry type with realistic secrets
    const loginSecretPass = 'SecretPasswordPlaintext#999';
    const loginTotp = 'JBSWY3DPEHPK3PXP';
    const loginRecoveryCode = 'RECOVERY-CODE-SECRET-777';
    const noteSecretBody = 'Extremely confidential server credentials and private access codes.';
    const apiSecretKey = 'sk-ant-live-secret-api-key-value-12345';
    const apiSecretSigning = 'whsec_very_private_signing_secret_99999';

    const login = await repo.createEntry<LoginEntry>({
      type: 'login',
      title: 'GitHub Enterprise',
      username: 'corp.developer@company.internal',
      password: loginSecretPass,
      url: 'https://github.company.internal',
      domain: 'github.company.internal',
      totpSecret: loginTotp,
      recoveryCodes: [loginRecoveryCode],
      tags: ['git', 'corp', 'development'],
    });

    const note = await repo.createEntry<NoteEntry>({
      type: 'note',
      title: 'Internal Infrastructure Guide',
      content: noteSecretBody,
      category: 'infrastructure',
      tags: ['infra', 'internal'],
    });

    const apiKey = await repo.createEntry<ApiKeyEntry>({
      type: 'api_key',
      title: 'Payment Webhook API',
      service: 'stripe-billing',
      apiKey: apiSecretKey,
      apiSecret: apiSecretSigning,
      tags: ['billing', 'payments'],
    });

    // 1. Test getMetadataList()
    const metadataList = await repo.getMetadataList();
    assert.equal(metadataList.length, 3);

    const projectedLogin = metadataList.find((m) => m.id === login.id)!;
    const projectedNote = metadataList.find((m) => m.id === note.id)!;
    const projectedApiKey = metadataList.find((m) => m.id === apiKey.id)!;

    assert.ok(projectedLogin);
    assert.ok(projectedNote);
    assert.ok(projectedApiKey);

    // Assert allowlisted fields are present
    assert.equal(projectedLogin.title, 'GitHub Enterprise');
    assert.equal(projectedLogin.domain, 'github.company.internal');
    assert.deepEqual(projectedLogin.tags, ['git', 'corp', 'development']);
    assert.ok(Array.isArray(projectedLogin.fieldLabels));
    assert.ok(projectedLogin.fieldLabels.includes('username'));
    assert.ok(projectedLogin.fieldLabels.includes('password'));

    assert.equal(projectedNote.title, 'Internal Infrastructure Guide');
    assert.deepEqual(projectedNote.tags, ['infra', 'internal']);
    assert.deepEqual(projectedNote.fieldLabels, ['content', 'category']);

    assert.equal(projectedApiKey.title, 'Payment Webhook API');
    assert.equal(projectedApiKey.domain, 'stripe-billing');
    assert.deepEqual(projectedApiKey.fieldLabels, ['service', 'apiKey', 'apiSecret']);

    // 2. Denied fields verification across all projected objects
    for (const item of metadataList) {
      for (const denied of DENIED_SECRET_FIELD_KEYS) {
        assert.equal(
          (item as any)[denied],
          undefined,
          `Metadata item ${item.id} must not contain denied property "${denied}"`
        );
      }
    }

    // 3. String & serialization leakage verification
    const serializedProjection = JSON.stringify(metadataList);

    // Verify passwords, TOTP, recovery codes, note bodies, API keys NEVER appear in serialized metadata
    assert.ok(!serializedProjection.includes(loginSecretPass), 'Password must never appear in metadata');
    assert.ok(!serializedProjection.includes(loginTotp), 'TOTP seed must never appear in metadata');
    assert.ok(!serializedProjection.includes(loginRecoveryCode), 'Recovery code must never appear in metadata');
    assert.ok(!serializedProjection.includes(noteSecretBody), 'Note body must never appear in metadata');
    assert.ok(!serializedProjection.includes(apiSecretKey), 'API key value must never appear in metadata');
    assert.ok(!serializedProjection.includes(apiSecretSigning), 'API secret value must never appear in metadata');
    assert.ok(!serializedProjection.includes(masterPassword), 'Master password must never appear in metadata');

    // 4. Test getMetadataById
    const singleMeta = await repo.getMetadataById(login.id);
    assert.equal(singleMeta.id, login.id);
    assert.equal((singleMeta as any).password, undefined);
    assert.equal((singleMeta as any).totpSecret, undefined);
    const singleSerialized = JSON.stringify(singleMeta);
    assert.ok(!singleSerialized.includes(loginSecretPass));

    // 5. Test searchMetadata (metadata search over redacted view)
    const searchResults = await repo.searchMetadata('Enterprise');
    assert.equal(searchResults.length, 1);
    assert.equal(searchResults[0].id, login.id);
    assert.equal((searchResults[0] as any).password, undefined);

    const emptyResults = await repo.searchMetadata('NonExistentTerm');
    assert.equal(emptyResults.length, 0);
  });
});
