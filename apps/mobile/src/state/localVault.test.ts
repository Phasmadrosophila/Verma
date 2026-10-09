import test from 'node:test';
import assert from 'node:assert/strict';
import { localVault } from './localVault.js';
import { ApiError } from './apiClient.js';

/** Every test starts from a fresh, locked, seeded vault. */
function fresh() {
  (localVault as any).__reset();
}

test('localVault: unlock rejects the wrong passphrase, accepts the demo one', async () => {
  fresh();
  let status = await localVault.getVaultStatus();
  assert.equal(status.isLocked, true);
  assert.equal(status.isInitialized, true);

  await assert.rejects(
    () => localVault.unlockVault('nope'),
    (err: unknown) => err instanceof ApiError && err.status === 401
  );

  await localVault.unlockVault('verma-demo');
  status = await localVault.getVaultStatus();
  assert.equal(status.isLocked, false);
  assert.equal(status.status, 'unlocked');
});

test('localVault: locked vault refuses metadata/secret access', async () => {
  fresh();
  await assert.rejects(() => localVault.listEntries(), (e: unknown) => e instanceof ApiError && e.status === 423);
  await assert.rejects(() => localVault.getEntrySecret('1'), (e: unknown) => e instanceof ApiError && e.status === 423);
});

test('localVault: listEntries returns redacted metadata with NO secret fields', async () => {
  fresh();
  await localVault.unlockVault('verma-demo');
  const list = await localVault.listEntries();

  assert.ok(list.length >= 6, 'seeded entries present');
  const serialized = JSON.stringify(list);
  // Zero-secret boundary: no secret field name, no seeded secret value.
  for (const field of ['secret', 'password', 'content', 'apiKey', 'totpSecret', 'recoveryCodes']) {
    assert.ok(!serialized.includes(`"${field}"`), `secret field "${field}" leaked into list`);
  }
  assert.ok(!serialized.includes('demo-only-work-lantern-4821'), 'raw seed secret leaked into list');
  assert.ok(!serialized.includes('little-universe'), 'note body secret leaked into list');

  // api_key seed row surfaces as mobile 'api' with a display domain, no secret.
  const api = list.find((e) => e.type === 'api');
  assert.ok(api, 'api entry present');
  assert.ok(!('secret' in (api as any)));
});

test('localVault: getEntrySecret returns the plaintext secret for that one entry', async () => {
  fresh();
  await localVault.unlockVault('verma-demo');
  const secret = await localVault.getEntrySecret('1');
  assert.equal(secret, 'demo-only-work-lantern-4821');

  await assert.rejects(
    () => localVault.getEntrySecret('does-not-exist'),
    (e: unknown) => e instanceof ApiError && e.status === 404
  );
});

test('localVault: create/update/delete round-trip', async () => {
  fresh();
  await localVault.unlockVault('verma-demo');
  const before = (await localVault.listEntries()).length;

  const created = await localVault.createEntry({
    type: 'api',
    title: 'Stripe',
    domain: 'stripe',
    tags: ['Work'],
    secret: 'sk_offline_test',
  });
  assert.equal(created.type, 'api');
  assert.ok(!('secret' in (created as any)), 'create result carries no secret');
  assert.equal((await localVault.listEntries()).length, before + 1);
  // secret is retrievable only via explicit reveal
  assert.equal(await localVault.getEntrySecret(created.id), 'sk_offline_test');

  const updated = await localVault.updateEntry(created.id, {
    type: 'api',
    title: 'Stripe Live',
    domain: 'stripe',
    tags: ['Work', 'Billing'],
    secret: 'sk_offline_updated',
  });
  assert.equal(updated.title, 'Stripe Live');
  assert.equal(await localVault.getEntrySecret(created.id), 'sk_offline_updated');

  await localVault.deleteEntry(created.id);
  assert.equal((await localVault.listEntries()).length, before);
  await assert.rejects(
    () => localVault.getEntrySecret(created.id),
    (e: unknown) => e instanceof ApiError && e.status === 404
  );
});

test('localVault: askVault returns matches by metadata without exposing secrets', async () => {
  fresh();
  await localVault.unlockVault('verma-demo');
  const res = await localVault.askVault('github');

  assert.ok(res.relevantEntryIds.length >= 1, 'github matched at least one entry');
  assert.ok(res.relevantEntryIds.includes('2'), 'GitHub seed (id 2) is relevant');
  // Answer must not contain any seeded secret.
  for (const bad of ['demo-only-github-cobalt-7294', 'little-universe', 'sk_']) {
    assert.ok(!res.answer.includes(bad), `secret leaked into ask answer: ${bad}`);
  }
});
