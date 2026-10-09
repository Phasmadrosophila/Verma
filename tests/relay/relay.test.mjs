import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { spawn } from 'node:child_process';

const token = 'test-relay-token-not-a-secret';
const ciphertext = Buffer.from('synthetic-encrypted-envelope-v1:4c61e8b3');

async function startRelay(dataDir, maxBytes = '1024') {
  const child = spawn(process.execPath, ['relay/server.mjs'], {
    env: { ...process.env, PORT: '0', RELAY_AUTH_TOKEN: token, RELAY_DATA_DIR: dataDir, RELAY_MAX_ENVELOPE_BYTES: maxBytes },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('relay did not start')), 5_000);
    child.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/^listening:(\d+)$/m);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`relay exited: ${code}`)));
  });
  return { child, url: `http://127.0.0.1:${port}` };
}

async function request(url, path, options = {}) {
  return fetch(`${url}${path}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
}

test('AC-A-M0-04-04: relay stores and returns only an opaque synthetic encrypted envelope', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'verma-relay-'));
  const { child, url } = await startRelay(dataDir);
  try {
    assert.equal((await fetch(`${url}/health`)).status, 200);
    assert.equal((await fetch(`${url}/v1/envelopes`)).status, 401);

    const invalid = await request(url, '/v1/envelopes/not valid', {
      method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: ciphertext,
    });
    assert.equal(invalid.status, 400);

    const stored = await request(url, '/v1/envelopes/demo-envelope-01', {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream', 'x-verma-envelope-version': '1' },
      body: ciphertext,
    });
    assert.equal(stored.status, 201);
    assert.deepEqual(await stored.json(), { id: 'demo-envelope-01', bytes: ciphertext.length });

    const listed = await request(url, '/v1/envelopes');
    assert.deepEqual(await listed.json(), { envelopes: [{ id: 'demo-envelope-01', bytes: ciphertext.length }] });

    const fetched = await request(url, '/v1/envelopes/demo-envelope-01');
    assert.deepEqual(Buffer.from(await fetched.arrayBuffer()), ciphertext);
    assert.deepEqual(await readFile(join(dataDir, 'demo-envelope-01.bin')), ciphertext);
    assert.equal((await readFile(join(dataDir, 'demo-envelope-01.bin'))).includes(Buffer.from('canary')), false);
  } finally {
    child.kill();
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('AC-A-M0-04-04: relay rejects an oversized envelope before it reaches storage', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'verma-relay-'));
  const { child, url } = await startRelay(dataDir, '8');
  try {
    const response = await request(url, '/v1/envelopes/oversized-envelope', {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream', 'x-verma-envelope-version': '1', 'content-length': '9' },
      body: Buffer.alloc(9),
    });
    assert.equal(response.status, 413);
  } finally {
    child.kill();
    await rm(dataDir, { recursive: true, force: true });
  }
});
