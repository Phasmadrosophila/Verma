import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';

async function start(script) {
  const probe = createServer().listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, [script, '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Preview did not start')); }, 5000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Preview exited: ${code}`)); });
    child.stdout.on('data', data => { if (String(data).includes('ready at')) { clearTimeout(timeout); resolve(); } });
  });
  return { child, origin: `http://127.0.0.1:${port}` };
}

for (const [script, pages] of [
  ['server.mjs', ['/', '/app?demo=1', '/cloud', '/cloud/', '/download', '/download/']],
  ['apps/mobile-preview/server.mjs', ['/?demo=1']],
]) {
  test(`AC-C-MR-03-01/02: ${script} serves every HTML, CSS and module dependency`, async () => {
    const { child, origin } = await start(script);
    const checked = new Set();
    async function visit(path) {
      const url = new URL(path, origin);
      if (checked.has(url.href)) return;
      checked.add(url.href);
      const response = await fetch(url);
      assert.equal(response.status, 200, url.href);
      const type = response.headers.get('content-type');
      if (/font\//.test(type)) {
        assert.ok((await response.arrayBuffer()).byteLength > 1000);
        return;
      }
      if (!/text\/html|text\/css|javascript/.test(type)) return;
      const body = await response.text();
      const dependencies = /text\/html/.test(type)
        ? [...body.matchAll(/(?:src|href)=["']([^"']+\.(?:css|js|png|svg|woff2|ttf))["']/g)]
        : /text\/css/.test(type)
          ? [...body.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)]
          : [...body.matchAll(/(?:from\s*|import\s*)["'](\.\.?\/[^"']+)["']/g)];
      for (const [, dependency] of dependencies) {
        if (dependency.startsWith('data:') || dependency.startsWith('#')) continue;
        const target = new URL(dependency, response.url);
        assert.equal(target.origin, origin, `External render dependency: ${target}`);
        await visit(target);
      }
    }
    try {
      for (const page of pages) await visit(page);
      // These modules and CSS backgrounds are loaded after interaction.
      await visit('/preview-storage.js');
      await visit('/vault.js');
    } finally {
      child.kill();
      await once(child, 'exit');
    }
  });
}
