import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { previewStorage } from '../preview-storage.js';

test('previewStorage persists in normal mode and isolates demo mode in memory', () => {
  const store = new Map();
  const mockLocalStorage = () => ({
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
  });

  // Normal mode persists to localStorage
  const normal1 = previewStorage('', mockLocalStorage);
  normal1.setItem('my_key', 'persisted_val');
  assert.equal(store.get('my_key'), 'persisted_val');

  const normal2 = previewStorage('', mockLocalStorage);
  assert.equal(normal2.getItem('my_key'), 'persisted_val');

  // Demo mode never touches localStorage
  let diskTouched = false;
  const guardedStorage = () => ({
    getItem: () => { diskTouched = true; return null; },
    setItem: () => { diskTouched = true; },
  });
  const demo = previewStorage('?demo=1', guardedStorage);
  demo.setItem('demo_key', 'session_only');
  assert.equal(demo.getItem('demo_key'), 'session_only');
  assert.equal(diskTouched, false, 'Demo mode must not write or read from storage');
});

import { fileURLToPath } from 'node:url';

test('Mobile preview server proxies backend and handles CORS preflight', async () => {
  const testPort = 5998;
  const serverScript = fileURLToPath(new URL('../server.mjs', import.meta.url));
  const proc = spawn(process.execPath, [serverScript, '--port', String(testPort)], {
    env: { ...process.env, BACKEND_URL: 'http://127.0.0.1:4998' },
    stdio: 'pipe',
  });

  try {
    await sleep(600);
    const origin = `http://127.0.0.1:${testPort}`;

    // 1. Health check returns status
    const healthRes = await fetch(`${origin}/health`);
    assert.equal(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.equal(healthData.service, 'verma-mobile-preview');

    // 2. CORS preflight OPTIONS returns 204
    const optRes = await fetch(`${origin}/api/entries`, { method: 'OPTIONS' });
    assert.equal(optRes.status, 204);
    assert.equal(optRes.headers.get('access-control-allow-origin'), '*');

    // 3. API proxy returns 503 when backend target is offline
    const apiRes = await fetch(`${origin}/api/vault/status`);
    assert.equal(apiRes.status, 503);
    const apiData = await apiRes.json();
    assert.equal(apiData.isOffline, true);
  } finally {
    proc.kill();
  }
});
