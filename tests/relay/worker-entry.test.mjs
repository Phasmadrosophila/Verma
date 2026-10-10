import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../../apps/web/worker/index.mjs';

/**
 * Builds a minimal `env` whose ASSETS binding emulates the SPA fallback: any
 * unknown path returns index.html with a 200 text/html response (the exact
 * behavior that used to make the frontend hang in 'loading').
 */
function makeEnv() {
  const state = { assetsCalls: 0 };
  return {
    state,
    ASSETS: {
      fetch: async () => {
        state.assetsCalls += 1;
        return new Response('<!doctype html><html><body>SPA</body></html>', {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      },
    },
  };
}

test('AC-A-MR-01-03: unknown /api/* returns an explicit JSON 503, never the SPA HTML', async () => {
  const env = makeEnv();
  const res = await worker.fetch(
    new Request('https://verma-web.example.workers.dev/api/vault/status'),
    env
  );

  assert.equal(res.status, 503);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const body = await res.json();
  assert.equal(body.code, 'backend_unavailable');
  assert.equal(env.state.assetsCalls, 0);
});

test('AC-A-MR-01-01: non-API deep links fall through to the static asset handler', async () => {
  const env = makeEnv();
  const res = await worker.fetch(
    new Request('https://verma-web.example.workers.dev/entry/abc123'),
    env
  );

  assert.equal(res.status, 200);
  assert.equal(env.state.assetsCalls, 1);
});

test('AC-A-MR-01-05: relay health path is served by the relay, not the SPA fallback', async () => {
  const env = makeEnv();
  const res = await worker.fetch(
    new Request('https://verma-web.example.workers.dev/health'),
    env
  );

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  const body = await res.json();
  assert.equal(body.service, 'verma-cloudflare-relay');
  assert.equal(env.state.assetsCalls, 0);
});
