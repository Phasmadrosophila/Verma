import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

test('Landing Server: Serves pages, handles routes, and proxies backend endpoints', async () => {
  const testPort = 3999;
  const proc = spawn('node', ['server.mjs'], {
    env: { ...process.env, PORT: String(testPort), BACKEND_URL: 'http://127.0.0.1:4999' },
    stdio: 'pipe',
  });

  try {
    // Wait for server to start
    await sleep(600);

    const baseUrl = `http://127.0.0.1:${testPort}`;

    // 1. Health check endpoint (backend readiness)
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.equal(healthData.status, 'ok');
    assert.equal(healthData.service, 'verma-landing-server');

    // 2. /app endpoint serves onboarding application with id="content"
    const appRes = await fetch(`${baseUrl}/app`);
    assert.equal(appRes.status, 200);
    const appHtml = await appRes.text();
    assert.ok(appHtml.includes('id="content"'), '/app must include id="content" for onboarding app');

    // 3. /app/ redirects to /app
    const nestedRes = await fetch(`${baseUrl}/app/`, { redirect: 'manual' });
    assert.equal(nestedRes.status, 302);
    assert.equal(nestedRes.headers.get('location'), '/app');

    // 4. /download endpoint
    const downloadRes = await fetch(`${baseUrl}/download`);
    assert.equal(downloadRes.status, 200);
    const downloadHtml = await downloadRes.text();
    assert.ok(downloadHtml.includes('Verma Local'));
    assert.ok(downloadHtml.includes('Self-hosted'));
    assert.ok(downloadHtml.includes('Enterprise'));

    // 5. /pricing endpoint
    const pricingRes = await fetch(`${baseUrl}/pricing`);
    assert.equal(pricingRes.status, 200);
    const pricingHtml = await pricingRes.text();
    assert.ok(pricingHtml.includes('Verma Local'));

    // 6. /cloud endpoint
    const cloudRes = await fetch(`${baseUrl}/cloud`);
    assert.equal(cloudRes.status, 200);
    const cloudHtml = await cloudRes.text();
    assert.ok(cloudHtml.includes('Verma Cloud'));

    // 7. /api/* endpoint handling (returns clean JSON with offline indicator or proxies)
    const apiRes = await fetch(`${baseUrl}/api/vault/status`);
    assert.ok(apiRes.status === 200 || apiRes.status === 503);
    const apiData = await apiRes.json();
    assert.ok(apiData.status || apiData.isOffline || apiData.error);
  } finally {
    proc.kill();
  }
});
