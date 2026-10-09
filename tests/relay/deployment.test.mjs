import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('AC-A-M0-04-03: deployment defines a pinned non-root relay with a healthcheck and persistent volume', async () => {
  const [dockerfile, compose, smoke] = await Promise.all([
    readFile('Dockerfile', 'utf8'),
    readFile('compose.yaml', 'utf8'),
    readFile('scripts/smoke/relay-smoke.ps1', 'utf8'),
  ]);
  assert.match(dockerfile, /(mirror\.gcr\.io\/library\/)?node:22-bookworm-slim@sha256:[a-f0-9]{64}/);
  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(compose, /relay-data:\/data/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(smoke, /synthetic-encrypted-envelope/);
});
