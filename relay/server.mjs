import { createServer } from 'node:http';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const dataDir = process.env.RELAY_DATA_DIR ?? '/data';
const token = process.env.RELAY_AUTH_TOKEN;
const maxBytes = Number.parseInt(process.env.RELAY_MAX_ENVELOPE_BYTES ?? '1048576', 10);
const idPattern = /^[A-Za-z0-9_-]{8,64}$/;

if (!token || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || !Number.isSafeInteger(port) || port < 0) {
  process.exitCode = 1;
  throw new Error('Invalid relay configuration');
}
await mkdir(dataDir, { recursive: true });

function send(response, status, body, headers = {}) {
  response.writeHead(status, { 'cache-control': 'no-store', ...headers });
  response.end(body);
}

function authenticated(request) {
  const value = request.headers.authorization;
  const expected = `Bearer ${token}`;
  if (typeof value !== 'string' || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

function validEnvelopeRequest(request, id) {
  return idPattern.test(id) && request.headers['content-type'] === 'application/octet-stream' && request.headers['x-verma-envelope-version'] === '1';
}

async function readEnvelope(request) {
  const length = Number.parseInt(request.headers['content-length'] ?? '', 10);
  if (!Number.isSafeInteger(length) || length < 1) return { error: 400 };
  if (length > maxBytes) return { error: 413 };
  const chunks = [];
  let received = 0;
  for await (const chunk of request) {
    received += chunk.length;
    if (received > maxBytes) return { error: 413 };
    chunks.push(chunk);
  }
  if (received !== length) return { error: 400 };
  return { value: Buffer.concat(chunks, received) };
}

async function listEnvelopes() {
  const files = await readdir(dataDir, { withFileTypes: true });
  const envelopes = [];
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith('.bin')) continue;
    const id = file.name.slice(0, -4);
    if (!idPattern.test(id)) continue;
    const payload = await readFile(join(dataDir, file.name));
    envelopes.push({ id, bytes: payload.length });
  }
  return envelopes.sort((left, right) => left.id.localeCompare(right.id));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (request.method === 'GET' && url.pathname === '/health') return send(response, 200, '{"status":"ok"}', { 'content-type': 'application/json' });
    if (!authenticated(request)) return send(response, 401, 'Unauthorized');
    if (request.method === 'GET' && url.pathname === '/v1/envelopes') return send(response, 200, JSON.stringify({ envelopes: await listEnvelopes() }), { 'content-type': 'application/json' });
    const match = url.pathname.match(/^\/v1\/envelopes\/([^/]+)$/);
    if (!match) return send(response, 404, 'Not found');
    const id = match[1];
    if (request.method === 'POST') {
      if (!validEnvelopeRequest(request, id)) return send(response, 400, 'Invalid envelope schema');
      const envelope = await readEnvelope(request);
      if (envelope.error) return send(response, envelope.error, envelope.error === 413 ? 'Envelope too large' : 'Invalid envelope');
      const staging = join(dataDir, `.${randomUUID()}.tmp`);
      await writeFile(staging, envelope.value, { flag: 'wx', mode: 0o600 });
      await rename(staging, join(dataDir, `${id}.bin`));
      return send(response, 201, JSON.stringify({ id, bytes: envelope.value.length }), { 'content-type': 'application/json' });
    }
    if (request.method === 'GET') {
      if (!idPattern.test(id)) return send(response, 400, 'Invalid envelope id');
      try {
        const payload = await readFile(join(dataDir, `${id}.bin`));
        return send(response, 200, payload, { 'content-type': 'application/octet-stream' });
      } catch (error) {
        if (error?.code === 'ENOENT') return send(response, 404, 'Not found');
        throw error;
      }
    }
    return send(response, 405, 'Method not allowed');
  } catch {
    return send(response, 500, 'Internal server error');
  }
});
server.listen(port, '0.0.0.0', () => process.stdout.write(`listening:${server.address().port}\n`));
async function shutdown() { await new Promise((resolve) => server.close(resolve)); }
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
