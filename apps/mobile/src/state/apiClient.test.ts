import test from 'node:test';
import assert from 'node:assert/strict';
import {
  httpClient,
  ApiError,
  toWireType,
  fromWireType,
  toMetadataEntry,
} from './apiClient.js';

interface FetchCall {
  url: string;
  init?: RequestInit;
}

/** Install a fake global.fetch; returns the recorded calls + a restore fn. */
function mockFetch(
  handler: (url: string, init?: RequestInit) => { ok?: boolean; status?: number; body?: unknown } | 'reject'
): { calls: FetchCall[]; restore: () => void } {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const result = handler(url, init);
    if (result === 'reject') {
      throw new TypeError('Network request failed');
    }
    const status = result.status ?? 200;
    return {
      ok: result.ok ?? (status >= 200 && status < 300),
      status,
      json: async () => result.body ?? null,
    } as Response;
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

test('toMetadataEntry: strips every secret field from a leaky /api/entries row', () => {
  // Shape taken verbatim from the live GET /api/entries (which leaks secrets).
  const leakyApiKey = {
    id: 'syn-api-001',
    type: 'api_key',
    title: 'Stripe Test Secret Key',
    tags: ['billing'],
    service: 'stripe',
    apiKey: 'sk_test_synthetic_leak',
    apiSecret: 'whsec_synthetic_leak',
    keyId: 'key_test_stripe_001',
    createdAt: 1,
    updatedAt: 2,
  };
  const projected = toMetadataEntry(leakyApiKey);
  const serialized = JSON.stringify(projected);

  assert.equal(projected.id, 'syn-api-001');
  assert.equal(projected.type, 'api', 'api_key must map to mobile "api"');
  assert.equal(projected.domain, 'stripe');
  // No secret value or secret key may survive the projection.
  for (const field of ['apiKey', 'apiSecret', 'password', 'content', 'totpSecret', 'recoveryCodes', 'keyId']) {
    assert.ok(!(field in (projected as any)), `secret-bearing field "${field}" leaked onto metadata`);
  }
  assert.ok(!serialized.includes('sk_test_synthetic_leak'), 'raw apiKey leaked into metadata');
  assert.ok(!serialized.includes('whsec_synthetic_leak'), 'raw apiSecret leaked into metadata');

  // A login row with password/totp/recovery codes must likewise be stripped.
  const leakyLogin = {
    id: 'syn-login-001', type: 'login', title: 'GitHub', tags: [],
    username: 'u', password: 'Syn-Pass-Leak', totpSecret: 'JBSWY', recoveryCodes: ['R1'],
    domain: 'github.com', createdAt: 1, updatedAt: 2,
  };
  const loginSerialized = JSON.stringify(toMetadataEntry(leakyLogin));
  assert.ok(!loginSerialized.includes('Syn-Pass-Leak'), 'raw password leaked');
  assert.ok(!loginSerialized.includes('JBSWY'), 'raw totpSecret leaked');
  assert.ok(!loginSerialized.includes('R1'), 'raw recovery code leaked');
});

test('apiClient: type mapping maps api <-> api_key both directions', () => {
  assert.equal(toWireType('api'), 'api_key');
  assert.equal(toWireType('login'), 'login');
  assert.equal(toWireType('note'), 'note');

  assert.equal(fromWireType('api_key'), 'api');
  assert.equal(fromWireType('login'), 'login');
  assert.equal(fromWireType('note'), 'note');
});

test('apiClient: listEntries hits /api/metadata and maps api_key -> api', async () => {
  const { calls, restore } = mockFetch((url) => {
    assert.ok(url.endsWith('/api/metadata'), `unexpected url ${url}`);
    return {
      body: {
        metadata: [
          { id: 'e1', type: 'login', title: 'GitHub', domain: 'github.com', tags: ['Dev'], updatedAt: 0 },
          { id: 'e2', type: 'api_key', title: 'DigitalOcean', domain: 'digitalocean', tags: [], updatedAt: 0 },
        ],
      },
    };
  });
  try {
    const entries = await httpClient.listEntries();
    assert.equal(calls.length, 1);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].type, 'login');
    assert.equal(entries[1].type, 'api', 'api_key must surface as mobile "api"');
    assert.equal(entries[0].id, 'e1');
    // list view must NOT carry a secret field
    assert.ok(!('secret' in entries[0]), 'metadata entry must not expose a secret');
  } finally {
    restore();
  }
});

test('apiClient: createEntry maps mobile "api" draft to api_key wire payload', async () => {
  const { calls, restore } = mockFetch((url) => {
    assert.ok(url.endsWith('/api/entries'));
    return {
      status: 201,
      body: { entry: { id: 'new1', type: 'api_key', title: 'Stripe', service: 'stripe', apiKey: 'sk_x', tags: ['Work'], updatedAt: 0 } },
    };
  });
  try {
    const created = await httpClient.createEntry({
      type: 'api',
      title: 'Stripe',
      domain: 'stripe',
      tags: ['Work'],
      secret: 'sk_x',
    });
    const sent = JSON.parse(String(calls[0].init?.body));
    assert.equal(calls[0].init?.method, 'POST');
    assert.equal(sent.type, 'api_key', 'wire payload must use api_key, not api');
    assert.equal(sent.apiKey, 'sk_x');
    assert.equal(sent.service, 'stripe');
    // response projected back to mobile type
    assert.equal(created.type, 'api');
    assert.equal(created.id, 'new1');
    assert.ok(!('secret' in created));
  } finally {
    restore();
  }
});

test('apiClient: updateEntry uses PUT /api/entries/:id and omits type', async () => {
  const { calls, restore } = mockFetch((url) => {
    assert.ok(url.endsWith('/api/entries/e9'));
    return { body: { entry: { id: 'e9', type: 'login', title: 'X', password: 'p', tags: [], updatedAt: 0 } } };
  });
  try {
    await httpClient.updateEntry('e9', { type: 'login', title: 'X', user: 'u', tags: [], secret: 'p' });
    const sent = JSON.parse(String(calls[0].init?.body));
    assert.equal(calls[0].init?.method, 'PUT');
    assert.ok(!('type' in sent), 'update payload must not include type');
    assert.equal(sent.password, 'p');
  } finally {
    restore();
  }
});

test('apiClient: getEntrySecret fetches full entry and returns the plaintext secret', async () => {
  const { calls, restore } = mockFetch((url) => {
    assert.ok(url.endsWith('/api/entries/e1'));
    return { body: { entry: { id: 'e1', type: 'login', title: 'X', password: 'hunter2', tags: [], updatedAt: 0 } } };
  });
  try {
    const secret = await httpClient.getEntrySecret('e1');
    assert.equal(secret, 'hunter2');
    assert.equal(calls[0].init?.method ?? 'GET', 'GET');
  } finally {
    restore();
  }
});

test('apiClient: deleteEntry issues DELETE to the entry URL', async () => {
  const { calls, restore } = mockFetch(() => ({ body: { success: true } }));
  try {
    await httpClient.deleteEntry('e1');
    assert.ok(calls[0].url.endsWith('/api/entries/e1'));
    assert.equal(calls[0].init?.method, 'DELETE');
  } finally {
    restore();
  }
});

test('apiClient: a transport failure yields a typed network ApiError (no crash)', async () => {
  const { restore } = mockFetch(() => 'reject');
  try {
    await assert.rejects(
      () => httpClient.listEntries(),
      (err: unknown) => {
        assert.ok(err instanceof ApiError, 'must be an ApiError, not a raw throw');
        assert.equal(err.isNetworkError, true);
        assert.equal(err.status, 0);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test('apiClient: a non-2xx response yields a typed ApiError carrying the server message', async () => {
  const { restore } = mockFetch(() => ({ status: 423, body: { error: 'Vault is locked' } }));
  try {
    await assert.rejects(
      () => httpClient.listEntries(),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 423);
        assert.equal(err.isNetworkError, false);
        assert.equal(err.message, 'Vault is locked');
        return true;
      }
    );
  } finally {
    restore();
  }
});
