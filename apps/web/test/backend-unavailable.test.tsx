import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { api, isJsonResponse } from '../src/api.js';
import { loadVaultState } from '../src/VaultContext.js';
import { BackendUnavailable } from '../src/components/BackendUnavailable.js';

const htmlResponse = (body = '<!doctype html><html><body>SPA</body></html>') =>
  new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });

// The eternal-loading defect (issue #79): a static SPA fallback answers an API
// call with an HTML 200, so `res.json()` throws and callers never leave
// 'loading'. These tests lock the guard and the 'unavailable' resolution in.
describe('AC-A-MR-01-03: backend unavailable resolution', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('isJsonResponse only accepts an application/json content type', () => {
    assert.equal(
      isJsonResponse(new Response('{}', { headers: { 'content-type': 'application/json' } })),
      true
    );
    assert.equal(
      isJsonResponse(
        new Response('{}', { headers: { 'content-type': 'application/json; charset=utf-8' } })
      ),
      true
    );
    assert.equal(isJsonResponse(htmlResponse()), false);
    assert.equal(isJsonResponse(new Response('{}')), false);
  });

  it('api calls throw an explicit non-JSON error instead of crashing on HTML', async () => {
    globalThis.fetch = (async () => htmlResponse()) as typeof fetch;
    await assert.rejects(api.getVaultStatus(), /non-JSON/i);
  });

  it('loadVaultState resolves to unavailable when the status endpoint is HTML', async () => {
    globalThis.fetch = (async () => htmlResponse()) as typeof fetch;

    const state = await loadVaultState(api.getVaultStatus);

    assert.equal(state.status, 'unavailable');
    assert.equal(state.isLocked, false);
    assert.equal(state.isInitialized, false);
  });

  it('loadVaultState still surfaces a valid JSON status payload', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ status: 'unlocked', isLocked: false, isInitialized: true }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )) as typeof fetch;

    const state = await loadVaultState(api.getVaultStatus);

    assert.equal(state.status, 'unlocked');
    assert.equal(state.isLocked, false);
    assert.equal(state.isInitialized, true);
  });

  it('renders the offline screen with an accessible Retry control and no secret data', () => {
    const html = renderToStaticMarkup(<BackendUnavailable onRetry={() => {}} />);

    assert.ok(html.includes('Vault backend offline'));
    assert.ok(html.includes('Retry'));
    assert.ok(html.includes('role="alert"'));
    assert.ok(!html.toLowerCase().includes('password'));
  });
});
