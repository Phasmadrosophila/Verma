import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toRedactedMetadata, projectEntriesMetadata } from '../src/redaction/index.js';
import type { LoginEntry, NoteEntry, ApiKeyEntry, VaultEntry } from '../src/types/entry.js';

describe('AC-B-M1-01-03: Allowlist Snapshot Test for Approved Metadata Fields', () => {
  const allowedKeys = new Set([
    'id',
    'type',
    'title',
    'domain',
    'tags',
    'createdAt',
    'updatedAt',
    'isReused',
    'isWeak',
    'fieldLabels',
    'importSource',
    'conflictMetadata',
  ]);

  const testLogin: LoginEntry = {
    id: 'login-allowlist-snapshot',
    type: 'login',
    title: 'Google Cloud Workspace',
    username: 'admin@startup.io',
    password: 'P@ssword123456!',
    url: 'https://console.cloud.google.com',
    domain: 'console.cloud.google.com',
    tags: ['work', 'cloud', 'gcp'],
    createdAt: 1710000000000,
    updatedAt: 1710000100000,
  };

  const testNote: NoteEntry = {
    id: 'note-allowlist-snapshot',
    type: 'note',
    title: 'Onboarding Checklist',
    content: 'Sensitive step by step onboarding documentation',
    category: 'hr',
    tags: ['internal', 'hr'],
    createdAt: 1710000200000,
    updatedAt: 1710000300000,
  };

  const testApiKey: ApiKeyEntry = {
    id: 'api-allowlist-snapshot',
    type: 'api_key',
    title: 'SendGrid Mailer',
    service: 'sendgrid',
    apiKey: 'SG.1234567890abcdef.secret',
    tags: ['email', 'prod'],
    createdAt: 1710000400000,
    updatedAt: 1710000500000,
  };

  it('should include strictly and only allowed keys in projected metadata snapshot', () => {
    const projected = toRedactedMetadata(testLogin, {
      isWeak: true,
      isReused: true,
      importSource: 'chrome_passwords.csv',
      conflictMetadata: {
        hasConflict: true,
        conflictFields: ['title', 'tags'],
        localUpdatedAt: 1710000100000,
        remoteUpdatedAt: 1710000150000,
        remoteDeviceId: 'dev-desktop-02',
      },
    })!;

    assert.ok(projected);

    // Verify all keys on projected object are in allowlist
    const objectKeys = Object.keys(projected);
    for (const key of objectKeys) {
      assert.ok(
        allowedKeys.has(key),
        `Unexpected key "${key}" found on projected metadata object`
      );
    }

    // Verify snapshot values for all approved fields
    assert.equal(projected.id, 'login-allowlist-snapshot');
    assert.equal(projected.type, 'login');
    assert.equal(projected.title, 'Google Cloud Workspace');
    assert.equal(projected.domain, 'console.cloud.google.com');
    assert.deepEqual(projected.tags, ['work', 'cloud', 'gcp']);
    assert.equal(projected.createdAt, 1710000000000);
    assert.equal(projected.updatedAt, 1710000100000);
    assert.equal(projected.isWeak, true);
    assert.equal(projected.isReused, true);
    assert.deepEqual(projected.fieldLabels, ['username', 'password', 'url']);
    assert.equal(projected.importSource, 'chrome_passwords.csv');
    assert.deepEqual(projected.conflictMetadata, {
      hasConflict: true,
      conflictFields: ['title', 'tags'],
      localUpdatedAt: 1710000100000,
      remoteUpdatedAt: 1710000150000,
      remoteDeviceId: 'dev-desktop-02',
    });
  });

  it('should correctly snapshot note and api_key entries', () => {
    const projectedNote = toRedactedMetadata(testNote)!;
    assert.equal(projectedNote.id, testNote.id);
    assert.equal(projectedNote.type, 'note');
    assert.equal(projectedNote.title, testNote.title);
    assert.deepEqual(projectedNote.tags, ['internal', 'hr']);
    assert.deepEqual(projectedNote.fieldLabels, ['content', 'category']);

    const projectedApi = toRedactedMetadata(testApiKey)!;
    assert.equal(projectedApi.id, testApiKey.id);
    assert.equal(projectedApi.type, 'api_key');
    assert.equal(projectedApi.title, testApiKey.title);
    assert.equal(projectedApi.domain, 'sendgrid');
    assert.deepEqual(projectedApi.tags, ['email', 'prod']);
    assert.deepEqual(projectedApi.fieldLabels, ['service', 'apiKey']);
  });
});
