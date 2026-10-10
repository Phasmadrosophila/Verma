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

test('AC-A-M0-04-06: Cloudflare Workers deployment defines serverless KV binding, safe CI/CD, and preview/production gates', async () => {
  const [webWrangler, workflow] = await Promise.all([
    readFile('apps/web/wrangler.jsonc', 'utf8'),
    readFile('.github/workflows/cloudflare-workers-deploy.yml', 'utf8'),
  ]);

  const config = JSON.parse(stripJsoncComments(webWrangler));

  // Worker contract (mirrors the parallel worker's apps/web/wrangler.jsonc)
  assert.equal(config.name, 'verma-web');
  assert.equal(config.main, 'worker/index.mjs');
  assert.equal(config.assets.directory, './dist');
  assert.equal(config.assets.not_found_handling, 'single-page-application');
  assert.equal(config.preview_urls, true);
  const kv = config.kv_namespaces.find((entry) => entry.binding === 'VERMA_RELAY_KV');
  assert(kv, 'kv_namespaces must bind VERMA_RELAY_KV');

  // Workflow safety & secret isolation verification
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID/);
  assert.match(workflow, /preview-deploy/);
  assert.match(workflow, /production-deploy/);
  assert.match(workflow, /versions upload/);
  assert.match(workflow, /--preview-alias/);
});

function stripJsoncComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}
