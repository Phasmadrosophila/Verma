import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dataDirectory = resolve(root, '.local', 'integration');
const dbPath = resolve(dataDirectory, 'vault.db');
const apiPort = Number(process.env.API_PORT ?? 3000);
const webPort = Number(process.env.WEB_PORT ?? 5173);
const seedFixtures = process.env.SEED_FIXTURES !== 'false';
const children: ChildProcess[] = [];
const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function command(name: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  const child = spawn(name, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  children.push(child);
  return child;
}

function runOnce(name: string, args: string[], env: NodeJS.ProcessEnv = {}): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(name, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${name} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

function waitForHttp(url: string, timeoutMs = 15_000): Promise<void> {
  const startedAt = Date.now();
  return new Promise((resolvePromise, reject) => {
    const check = () => {
      fetch(url).then((response) => {
        if (response.ok) resolvePromise();
        else throw new Error(`HTTP ${response.status}`);
      }).catch(() => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(check, 100);
      });
    };
    check();
  });
}

async function waitForHealth(timeoutMs = 15_000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${apiPort}/health`);
      if (response.ok) return;
    } catch {
      // The API is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`Timed out waiting for API health on localhost:${apiPort}`);
}

async function seed() {
  const status = await fetch(`http://127.0.0.1:${apiPort}/api/vault/status`).then((response) => response.json() as Promise<{ isInitialized: boolean }>);
  if (!status.isInitialized) {
    const response = await fetch(`http://127.0.0.1:${apiPort}/api/vault/init`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'SyntheticIntegrationPassword2026!' }),
    });
    if (!response.ok) throw new Error(`Vault initialization failed with HTTP ${response.status}`);
  } else {
    const response = await fetch(`http://127.0.0.1:${apiPort}/api/vault/unlock`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'SyntheticIntegrationPassword2026!' }),
    });
    if (!response.ok) throw new Error(`Vault unlock failed with HTTP ${response.status}`);
  }

  if (seedFixtures) {
    const entriesResponse = await fetch(`http://127.0.0.1:${apiPort}/api/entries`);
    if (!entriesResponse.ok) throw new Error(`Entry listing failed with HTTP ${entriesResponse.status}`);
    const entries = await entriesResponse.json() as { entries: unknown[] };
    if (entries.entries.length === 0) {
      const response = await fetch(`http://127.0.0.1:${apiPort}/api/fixtures/seed`, { method: 'POST' });
      if (!response.ok) throw new Error(`Fixture seed failed with HTTP ${response.status}`);
    }
  }
}

async function stop() {
  await Promise.all(children.map(async (child) => {
    if (child.exitCode !== null) return;
    if (process.platform === 'win32' && child.pid) {
      await runOnce('taskkill', ['/pid', String(child.pid), '/t', '/f']).catch(() => undefined);
      return;
    }
    child.kill('SIGTERM');
    await new Promise<void>((resolvePromise) => child.once('exit', () => resolvePromise()));
  }));
}

async function main() {
  await mkdir(dataDirectory, { recursive: true });
  if (process.env.RESET_INTEGRATION_DATA === 'true') await rm(dbPath, { force: true });
  await runOnce(packageManager, ['--filter', '@app/shared', 'build']);

  const api = command(packageManager, ['--filter', '@app/api', 'dev'], {
    PORT: String(apiPort),
    DB_PATH: dbPath,
  });
  api.once('exit', (code) => {
    if (code && !stopping) process.exitCode = code;
  });
  await waitForHealth();
  await seed();

  command(packageManager, ['--filter', '@app/web', 'dev', '--host', '127.0.0.1', '--port', String(webPort)], {
    VITE_API_PORT: String(apiPort),
  });
  await waitForHttp(`http://127.0.0.1:${webPort}/`);
  console.log(`Verma integration runtime ready: http://127.0.0.1:${webPort}`);
  console.log(`API health: http://127.0.0.1:${apiPort}/health`);
}

let stopping = false;
const handleSignal = async () => {
  if (stopping) return;
  stopping = true;
  await stop();
  process.exit(0);
};
process.once('SIGINT', handleSignal);
process.once('SIGTERM', handleSignal);

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Integration runtime failed');
  await stop();
  process.exit(1);
});
