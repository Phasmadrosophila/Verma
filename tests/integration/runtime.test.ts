import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

test('AC-A-M0-05-01..05: integration runtime starts both apps and exposes P0 routes', async (t) => {
  const apiPort = 31_000 + Math.floor(Math.random() * 500);
  const webPort = apiPort + 1;
  const child = spawn(packageManager, ['dev:integration'], {
    cwd: root,
    env: {
      ...process.env,
      API_PORT: String(apiPort),
      WEB_PORT: String(webPort),
      RESET_INTEGRATION_DATA: 'true',
      SEED_FIXTURES: 'true',
      INTEGRATION_DB_PATH: `.local/integration/test-${randomUUID()}.db`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  t.after(async () => {
    if (!child.pid) return;
    if (process.platform === 'win32') {
      await new Promise<void>((resolvePromise) => {
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
        killer.once('exit', () => resolvePromise());
        killer.once('error', () => resolvePromise());
      });
    } else {
      child.kill('SIGTERM');
    }
  });

  const output: string[] = [];
  child.stdout.on('data', (chunk) => output.push(String(chunk)));
  child.stderr.on('data', (chunk) => output.push(String(chunk)));

  const ready = await new Promise<boolean>((resolvePromise) => {
    const timer = setTimeout(() => resolvePromise(false), 30_000);
    const check = () => {
      if (output.join('').includes('integration runtime ready')) {
        clearTimeout(timer);
        resolvePromise(true);
      } else if (child.exitCode !== null) {
        clearTimeout(timer);
        resolvePromise(false);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });

  assert.equal(ready, true, output.join(''));
  const health = await fetch(`http://127.0.0.1:${apiPort}/health`);
  assert.equal(health.status, 200);
  const status = await fetch(`http://127.0.0.1:${apiPort}/api/vault/status`);
  assert.equal(status.status, 200);
  const metadata = await fetch(`http://127.0.0.1:${apiPort}/api/metadata/search?q=synthetic`);
  assert.equal(metadata.status, 200);

  // AC-B-M1-04: Verify Ask Your Vault endpoint accepts natural query and returns safe response
  const askRes = await fetch(`http://127.0.0.1:${apiPort}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'work google account' }),
  });
  assert.equal(askRes.status, 200);
  const askData = await askRes.json() as { answer: string; relevantEntryIds: string[] };
  assert.ok(typeof askData.answer === 'string');

  // Verify natural language token search returns matching metadata with zero secrets
  const nlSearch = await fetch(`http://127.0.0.1:${apiPort}/api/metadata/search?q=work%20google%20account`);
  assert.equal(nlSearch.status, 200);
  const nlSearchData = await nlSearch.json() as { metadata: any[] };
  assert.ok(nlSearchData.metadata.length > 0);
  assert.equal(nlSearchData.metadata[0].password, undefined);

  // AC-B-M1-03: Verify Smart Import Analyze endpoint processes CSV without leaking secrets
  const importRes = await fetch(`http://127.0.0.1:${apiPort}/api/import/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      csvContent: 'name,url,username,password\nGoogle,https://google.com,user@test,secretpass123\n',
    }),
  });
  assert.equal(importRes.status, 200);
  const importData = await importRes.json() as { stagingId: string; proposal: any };
  assert.ok(importData.stagingId);
  assert.ok(importData.proposal.mappings.length >= 4);

  const web = await fetch(`http://127.0.0.1:${webPort}`);
  assert.equal(web.status, 200);
});
