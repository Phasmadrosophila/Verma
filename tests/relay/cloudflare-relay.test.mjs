import assert from 'node:assert/strict';
import test from 'node:test';
import {
  handleRelayRequest,
  timingSafeEqual,
  isAuthenticated,
  ID_PATTERN,
} from '../../relay/cloudflare-relay.mjs';
import webWorker from '../../apps/web/worker/index.mjs';

class MockKVNamespace {
  constructor() {
    this.store = new Map();
  }

  async get(key, type = 'text') {
    const item = this.store.get(key);
    if (!item) return null;
    if (type === 'arrayBuffer') {
      const copy = new Uint8Array(item.data.byteLength);
      copy.set(item.data);
      return copy.buffer;
    }
    if (type === 'json') {
      return JSON.parse(new TextDecoder().decode(item.data));
    }
    return new TextDecoder().decode(item.data);
  }

  async put(key, value, options = {}) {
    let bytes;
    if (typeof value === 'string') {
      bytes = new TextEncoder().encode(value);
    } else if (value instanceof ArrayBuffer) {
      bytes = new Uint8Array(value);
    } else if (ArrayBuffer.isView(value)) {
      bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    } else {
      throw new Error('Unsupported value type');
    }
    this.store.set(key, { data: bytes, metadata: options.metadata });
  }

  async delete(key) {
    this.store.delete(key);
  }

  async list(options = {}) {
    const keys = [];
    for (const [name, item] of this.store.entries()) {
      if (options.prefix && !name.startsWith(options.prefix)) continue;
      keys.push({ name, metadata: item.metadata });
    }
    return { keys, list_complete: true };
  }
}

const TEST_TOKEN = 'test-cf-relay-auth-token-12345';
const SAMPLE_CIPHERTEXT = Buffer.from('synthetic-encrypted-envelope-v1:4c61e8b3-cloudflare-kv');

test('Cloudflare KV Relay - AC-A-M0-04-04 & Serverless Architecture Verification', async (t) => {
  await t.test('timingSafeEqual and isAuthenticated security utilities', () => {
    assert.equal(timingSafeEqual('exact-match-token', 'exact-match-token'), true);
    assert.equal(timingSafeEqual('exact-match-token', 'wrong-match-token'), false);
    assert.equal(timingSafeEqual('short', 'longer-string'), false);
    assert.equal(timingSafeEqual(123, 'string'), false);
    assert.equal(isAuthenticated(`Bearer ${TEST_TOKEN}`, TEST_TOKEN), true);
    assert.equal(isAuthenticated(`Bearer wrong-token`, TEST_TOKEN), false);
    assert.equal(isAuthenticated(undefined, TEST_TOKEN), false);
    assert.equal(isAuthenticated(`Bearer ${TEST_TOKEN}`, undefined), false);
  });

  await t.test('ID_PATTERN validation regex', () => {
    assert.equal(ID_PATTERN.test('envelope-01'), true);
    assert.equal(ID_PATTERN.test('12345678'), true);
    assert.equal(ID_PATTERN.test('short'), false); // < 8 chars
    assert.equal(ID_PATTERN.test('invalid id with spaces'), false);
    assert.equal(ID_PATTERN.test('invalid/path/traversal'), false);
  });

  await t.test('GET /health returns public 200 ok without authentication', async () => {
    const env = {
      VERMA_RELAY_KV: new MockKVNamespace(),
      RELAY_AUTH_TOKEN: TEST_TOKEN,
    };
    const req = new Request('http://localhost/health');
    const res = await handleRelayRequest(req, env);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const body = await res.json();
    assert.deepEqual(body, { status: 'ok', service: 'verma-cloudflare-relay' });

    // Method not allowed on POST /health
    const postHealth = await handleRelayRequest(new Request('http://localhost/health', { method: 'POST' }), env);
    assert.equal(postHealth.status, 405);
  });

  await t.test('Rejects unauthenticated requests to /v1 endpoints with 401', async () => {
    const env = {
      VERMA_RELAY_KV: new MockKVNamespace(),
      RELAY_AUTH_TOKEN: TEST_TOKEN,
    };
    const res = await handleRelayRequest(new Request('http://localhost/v1/envelopes'), env);
    assert.equal(res.status, 401);
    assert.equal(await res.text(), 'Unauthorized');
  });

  await t.test('Stores and retrieves opaque encrypted envelope via Cloudflare KV', async () => {
    const kv = new MockKVNamespace();
    const env = {
      VERMA_RELAY_KV: kv,
      RELAY_AUTH_TOKEN: TEST_TOKEN,
    };

    // 1. Initial list should be empty
    const listRes1 = await handleRelayRequest(
      new Request('http://localhost/v1/envelopes', {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
      }),
      env
    );
    assert.equal(listRes1.status, 200);
    assert.deepEqual(await listRes1.json(), { envelopes: [] });

    // 2. Reject invalid schema / header mismatches
    const badHeaderRes = await handleRelayRequest(
      new Request('http://localhost/v1/envelopes/demo-envelope-01', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'text/plain',
        },
        body: SAMPLE_CIPHERTEXT,
      }),
      env
    );
    assert.equal(badHeaderRes.status, 400);

    // 3. Post valid opaque envelope
    const storeRes = await handleRelayRequest(
      new Request('http://localhost/v1/envelopes/demo-envelope-01', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/octet-stream',
          'X-Verma-Envelope-Version': '1',
        },
        body: SAMPLE_CIPHERTEXT,
      }),
      env
    );
    assert.equal(storeRes.status, 201);
    assert.deepEqual(await storeRes.json(), {
      id: 'demo-envelope-01',
      bytes: SAMPLE_CIPHERTEXT.length,
    });

    // 4. Store second envelope
    const storeRes2 = await handleRelayRequest(
      new Request('http://localhost/v1/envelopes/alpha-envelope-02', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/octet-stream',
          'X-Verma-Envelope-Version': '1',
        },
        body: Buffer.from('second-payload'),
      }),
      env
    );
    assert.equal(storeRes2.status, 201);

    // 5. List envelopes - returned sorted by ID, metadata only
    const listRes2 = await handleRelayRequest(
      new Request('http://localhost/v1/envelopes', {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
      }),
      env
    );
    assert.equal(listRes2.status, 200);
    const listData = await listRes2.json();
    assert.deepEqual(listData.envelopes, [
      { id: 'alpha-envelope-02', bytes: Buffer.from('second-payload').length },
      { id: 'demo-envelope-01', bytes: SAMPLE_CIPHERTEXT.length },
    ]);

    // 6. Fetch envelope by ID - returns exact binary payload
    const getRes = await handleRelayRequest(
      new Request('http://localhost/v1/envelopes/demo-envelope-01', {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
      }),
      env
    );
    assert.equal(getRes.status, 200);
    assert.equal(getRes.headers.get('content-type'), 'application/octet-stream');
    const fetchedBuf = Buffer.from(await getRes.arrayBuffer());
    assert.deepEqual(fetchedBuf, SAMPLE_CIPHERTEXT);

    // 7. Non-existent envelope returns 404
    const notFoundRes = await handleRelayRequest(
      new Request('http://localhost/v1/envelopes/non-existent-99', {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
      }),
      env
    );
    assert.equal(notFoundRes.status, 404);
  });

  await t.test('Rejects oversized envelopes based on max byte limit', async () => {
    const kv = new MockKVNamespace();
    const env = {
      VERMA_RELAY_KV: kv,
      RELAY_AUTH_TOKEN: TEST_TOKEN,
      RELAY_MAX_ENVELOPE_BYTES: '64', // Small 64-byte limit for testing
    };

    const oversizedBuffer = Buffer.alloc(128, 'x');
    const res = await handleRelayRequest(
      new Request('http://localhost/v1/envelopes/oversized-01', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/octet-stream',
          'X-Verma-Envelope-Version': '1',
          'Content-Length': '128',
        },
        body: oversizedBuffer,
      }),
      env
    );
    assert.equal(res.status, 413);
    assert.equal(await res.text(), 'Envelope too large');
  });

  await t.test('Gracefully handles missing KV binding', async () => {
    const envWithoutKv = {
      RELAY_AUTH_TOKEN: TEST_TOKEN,
    };
    const res = await handleRelayRequest(
      new Request('http://localhost/v1/envelopes', {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
      }),
      envWithoutKv
    );
    assert.equal(res.status, 500);
    assert.equal(await res.text(), 'Relay storage unavailable');
  });

  await t.test('Worker entry correctly delegates relay and static routes', async () => {
    const kv = new MockKVNamespace();
    const env = {
      VERMA_RELAY_KV: kv,
      RELAY_AUTH_TOKEN: TEST_TOKEN,
      ASSETS: {
        fetch: async () => new Response('<html>index</html>', { status: 200 }),
      },
    };

    // Relay route handled by handleRelayRequest
    const healthRes = await webWorker.fetch(new Request('http://localhost/health'), env);
    assert.equal(healthRes.status, 200);
    assert.deepEqual(await healthRes.json(), { status: 'ok', service: 'verma-cloudflare-relay' });

    // Web SPA route delegated to ASSETS.fetch
    const staticRes = await webWorker.fetch(new Request('http://localhost/dashboard'), env);
    assert.equal(staticRes.status, 200);
    assert.equal(await staticRes.text(), '<html>index</html>');

    // Unknown /api/* returns an explicit JSON 503 instead of the SPA fallback
    const apiRes = await webWorker.fetch(new Request('http://localhost/api/unknown'), env);
    assert.equal(apiRes.status, 503);
    assert.match(apiRes.headers.get('content-type') ?? '', /application\/json/);
    assert.equal((await apiRes.json()).code, 'backend_unavailable');
  });
});
