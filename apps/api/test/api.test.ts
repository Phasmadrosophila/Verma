import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createApiApp } from '../src/index.js';
import { DeviceIdentity, VaultStore, encryptSymmetric, deriveKey } from '@app/shared';

describe('Apps API - Device and Sync Endpoints', () => {
  test('GET /health returns healthy status', async () => {
    const { app } = createApiApp();
    const res = await app.request('/health');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'healthy');
  });

  test('GET /api/device returns device identity and public key', async () => {
    const identity = new DeviceIdentity('Test-Node');
    const { app } = createApiApp({ identity });

    const res = await app.request('/api/device');
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.deviceId, identity.getDeviceId());
    assert.equal(body.deviceName, 'Test-Node');
    assert.equal(body.publicKeyHex, identity.getPublicKeyHex());
    assert.equal(body.status, 'idle');
    assert.equal(body.pairedPeersCount, 0);
  });

  test('POST /api/sync/pairing/invite generates pairing passphrase and initMessage', async () => {
    const { app } = createApiApp();
    const res = await app.request('/api/sync/pairing/invite', {
      method: 'POST',
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.passphrase);
    assert.ok(body.initMessage);
    assert.equal(body.initMessage.type, 'PAIRING_INIT');
  });

  test('POST /api/vault/entries/:id/tags updates tags and returns redacted metadata', async () => {
    const identity = new DeviceIdentity('Test-Node');
    const store = new VaultStore(identity.getDeviceId());
    const { app } = createApiApp({ identity, store });

    const key = deriveKey('master-pass', 'salt', 'key');
    store.saveEntry({
      id: 'entry-123',
      type: 'login',
      title: 'Google Account',
      tags: ['work'],
      encryptedSecret: encryptSymmetric('super-secret-password', key),
    });

    const res = await app.request('/api/vault/entries/entry-123/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: ['work', 'google', 'production'] }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();

    assert.deepEqual(body.entry.tags, ['work', 'google', 'production']);
    assert.equal(body.entry.title, 'Google Account');
    // Verify secret fields are redacted
    assert.equal(body.entry.encryptedSecret, undefined);
    assert.equal(body.entry.password, undefined);
  });
});
