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

test('AC-A-M0-04-06: Cloudflare deployment defines serverless KV binding, safe CI/CD, and preview/production gates', async () => {
  const [webWrangler, relayWrangler, workflow, webWorker] = await Promise.all([
    readFile('apps/web/wrangler.toml', 'utf8'),
    readFile('relay/wrangler.toml', 'utf8'),
    readFile('.github/workflows/cloudflare-deploy.yml', 'utf8'),
    readFile('apps/web/worker.mjs', 'utf8'),
  ]);

  // KV Namespace binding verification
  assert(webWrangler.includes('main = "worker.mjs"'));
  assert(webWrangler.includes('directory = "./dist"'));
  assert(webWrangler.includes('not_found_handling = "single-page-application"'));
  assert(webWrangler.includes('binding = "VERMA_RELAY_KV"'));
  assert(relayWrangler.includes('binding = "VERMA_RELAY_KV"'));
  assert(relayWrangler.includes('main = "worker.mjs"'));

  // Workflow safety & secret isolation verification
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID/);
  assert.match(workflow, /CLOUDFLARE_PROJECT_NAME/);
  assert.match(workflow, /preview-deploy/);
  assert.match(workflow, /production-deploy/);
  assert.match(workflow, /wrangler deploy --config apps\/web\/wrangler\.toml --env preview/);
  assert.match(workflow, /wrangler deploy --config apps\/web\/wrangler\.toml --name=/);
  assert.match(webWorker, /env\.ASSETS\.fetch/);
  assert.match(webWorker, /handleRelayRequest/);
});
