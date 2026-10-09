import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const chrome = process.env.CHROME_PATH ?? (process.platform === 'linux' ? '/usr/bin/google-chrome' : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
const artifactRoot = resolve(root, '.local', 'e2e');
const masterPassword = 'Synthetic-E2E-Master-Password-2026!';

type CdpResult = { result?: { value?: unknown }; exceptionDetails?: unknown };

const pause = (ms: number) => new Promise<void>((resolvePromise) => setTimeout(resolvePromise, ms));

async function waitFor(check: () => Promise<boolean>, message: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await pause(100);
  }
  throw new Error(message);
}

function start(command: string, args: string[], env: NodeJS.ProcessEnv): ChildProcess {
  return spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'ignore',
    // pnpm.cmd needs cmd.exe on Windows. Chrome must bypass it because its
    // absolute path contains spaces and no test data belongs in shell parsing.
    shell: process.platform === 'win32' && command !== chrome,
  });
}

async function stop(child: ChildProcess | undefined) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    await new Promise<void>((resolvePromise) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      killer.once('exit', () => resolvePromise());
      killer.once('error', () => resolvePromise());
    });
    return;
  }
  child.kill('SIGTERM');
}

class CdpPage {
  private readonly socket: WebSocket;
  private sequence = 0;
  private readonly pending = new Map<number, { resolve: (value: CdpResult) => void; reject: (reason: Error) => void }>();

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      if (message.error) request.reject(new Error('Chrome DevTools command failed'));
      else request.resolve(message.result ?? {});
    });
  }

  static async open(debugPort: number, url: string) {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/new`, { method: 'PUT' });
    if (!response.ok) throw new Error('Chrome did not create an E2E browser tab');
    const target = await response.json() as { webSocketDebuggerUrl: string };
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise<void>((resolvePromise, reject) => {
      socket.addEventListener('open', () => resolvePromise(), { once: true });
      socket.addEventListener('error', () => reject(new Error('Chrome DevTools connection failed')), { once: true });
    });
    const page = new CdpPage(socket);
    await page.command('Page.enable');
    await page.command('Page.navigate', { url });
    await waitFor(async () => {
      const state = await page.evaluate<{ href: string; readyState: string }>('({ href: location.href, readyState: document.readyState })');
      return state.href === url && state.readyState === 'complete';
    }, 'Browser page did not finish loading');
    return page;
  }

  private command(method: string, params: Record<string, unknown> = {}): Promise<CdpResult> {
    const id = ++this.sequence;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolvePromise, reject) => this.pending.set(id, { resolve: resolvePromise, reject }));
  }

  async evaluate<T>(expression: string): Promise<T> {
    const response = await this.command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }) as CdpResult;
    if (response.exceptionDetails) throw new Error('Browser evaluation failed: ' + JSON.stringify(response.exceptionDetails));
    return response.result?.value as T;
  }

  async text(): Promise<string> {
    return this.evaluate<string>('document.body ? document.body.innerText : ""');
  }

  async waitForText(text: string, timeoutMs?: number) {
    await waitFor(async () => (await this.text()).includes(text), `Timed out waiting for browser state: ${text}`, timeoutMs);
  }

  async clickText(text: string) {
    const clicked = await this.evaluate<boolean>(`(() => { const match = [...document.querySelectorAll('button,a,div')].find((node) => node.textContent?.trim() === ${JSON.stringify(text)}); if (!match) return false; match.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); match.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); match.click(); return true; })()`);
    assert.equal(clicked, true, `Missing clickable control: ${text}`);
  }

  async setInputByLabel(label: string, value: string) {
    const set = await this.evaluate<boolean>(`(() => { const label = [...document.querySelectorAll('label')].find((node) => node.textContent?.trim().startsWith(${JSON.stringify(label)})); let input = null; if (label) { const htmlFor = label.getAttribute('for'); if (htmlFor) { input = document.getElementById(htmlFor); } if (!input) { input = label.closest('div.flex-col')?.querySelector('input,textarea'); } if (!input) { input = label.parentElement?.querySelector('input,textarea'); } } if (!input) return false; const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value'); descriptor?.set?.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    assert.equal(set, true, `Missing input: ${label}`);
  }

  async setInputByPlaceholder(placeholder: string, value: string) {
    const set = await this.evaluate<boolean>(`(() => { const query = "input[placeholder*=\\"" + ${JSON.stringify(placeholder)} + "\\"]"; const input = document.querySelector(query); if (!input) return false; const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value'); descriptor?.set?.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    assert.equal(set, true, `Missing input with placeholder: ${placeholder}`);
  }

  async screenshot(name: string, expectedText?: string) {
    if (expectedText) await this.waitForText(expectedText);
    const body = await this.text();
    assert.doesNotMatch(body, /Syn-Pass-|Synthetic-Import-|sk_test_|whsec_|synth-admin/i, 'a denied synthetic value was rendered before a checkpoint');
    const response = await this.command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }) as { data: string };
    await writeFile(resolve(artifactRoot, name), Buffer.from(response.data, 'base64'));
  }

  async resize(width: number, height: number) {
    await this.command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  }

  close() { this.socket.close(); }
}

test('AC-E-MR-04-01..05: offline visual browser harness runs the real web and Hono API safely', async (t) => {
  const port = 32_000 + Math.floor(Math.random() * 1_000);
  const webPort = port + 1;
  const debugPort = port + 2;
  const runId = randomUUID();
  const dbPath = resolve(root, '.local', 'e2e', `vault-${runId}.db`);
  const chromeData = resolve(tmpdir(), `verma-e2e-${runId}`);
  let web: ChildProcess | undefined;
  let api: ChildProcess | undefined;
  let browser: ChildProcess | undefined;
  let page: CdpPage | undefined;

  await rm(artifactRoot, { recursive: true, force: true });
  await mkdir(artifactRoot, { recursive: true });
  await new Promise<void>((resolvePromise, reject) => {
    const build = start(packageManager, ['--filter', '@app/shared', 'build'], {});
    build.once('exit', (code) => code === 0 ? resolvePromise() : reject(new Error('Shared package build failed')));
    build.once('error', reject);
  });

  t.after(async () => {
    page?.close();
    await Promise.all([stop(browser), stop(api), stop(web)]);
    await new Promise(r => setTimeout(r, 500));
    await rm(chromeData, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
    await rm(dbPath, { force: true });
  });

  api = start(packageManager, ['--filter', '@app/api', 'dev'], { PORT: String(port), DB_PATH: dbPath });
  await waitFor(async () => (await fetch(`http://127.0.0.1:${port}/health`).catch(() => undefined))?.ok === true, 'Hono health endpoint did not become ready');
  web = start(packageManager, ['--filter', '@app/mobile', 'exec', 'expo', 'start', '--web', '--clear', '--port', String(webPort)], { EXPO_PUBLIC_API_URL: `http://127.0.0.1:${port}` });
  await waitFor(async () => (await fetch(`http://127.0.0.1:${webPort}/`).catch(() => undefined))?.ok === true, 'Expo web server did not become ready');
  browser = start(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${chromeData}`, '--no-first-run', 'about:blank'], {});
  await waitFor(async () => (await fetch(`http://127.0.0.1:${debugPort}/json/version`).catch(() => undefined))?.ok === true, 'Chrome did not become ready');
  page = await CdpPage.open(debugPort, `http://127.0.0.1:${webPort}/`);
  await page.resize(390, 844);

  // 1. Skip Onboarding
  await page.waitForText('Skip');
  await page.screenshot('01-loading-mobile.png', 'Skip');
  await page.clickText('Skip');

  // 2. Vault View (mock data)
  await page.waitForText('GitHub');
  await page.screenshot('02-vault-mobile.png', 'GitHub');

  // 3. Lock Vault
  await page.clickText('🔒');
  await page.waitForText('Vault is Locked');
  await page.screenshot('03-locked-mobile.png', 'Vault is Locked');

  // 4. Try empty password
  await page.setInputByPlaceholder('demo: verma-demo', '   ');
  await page.clickText('Unlock Vault');
  await page.waitForText('Please enter your master passphrase');
  await page.screenshot('04-unlock-error-mobile.png');

  // 5. Unlock Vault
  await page.setInputByPlaceholder('demo: verma-demo', 'verma-demo');
  await page.clickText('Unlock Vault');
  await page.waitForText('GitHub');
  await page.screenshot('05-unlocked-mobile.png', 'GitHub');

  const artifactNames = (await Promise.all([
    '01-loading-mobile.png', '02-vault-mobile.png', '03-locked-mobile.png',
    '04-unlock-error-mobile.png', '05-unlocked-mobile.png'
  ].map(async (name) => ({ name, bytes: (await readFile(resolve(artifactRoot, name))).byteLength }))));
  await writeFile(resolve(artifactRoot, 'summary.json'), JSON.stringify({ syntheticOnly: true, screenshots: artifactNames }, null, 2));
});
