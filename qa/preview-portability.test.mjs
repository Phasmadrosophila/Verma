import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { previewPort } from '../scripts/preview-options.mjs';
import { previewStorage } from '../apps/mobile-preview/preview-storage.js';

test('AC-C-MR-03-02: CLI port overrides environment and rejects invalid ports', () => {
  assert.equal(previewPort(5127, [], {}), 5127);
  assert.equal(previewPort(5127, [], { PORT: '6100' }), 6100);
  assert.equal(previewPort(5127, ['--port', '6200'], { PORT: '6100' }), 6200);
  for (const port of ['0', '65536', '-1', '5.5', 'abc', '']) {
    assert.throws(() => previewPort(5127, [`--port=${port}`], {}), /Port must/);
  }
});

test('AC-C-MR-03-03: demo never accesses existing storage; normal mode preserves it', () => {
  const demo = previewStorage('?demo=1', () => { throw new Error('Must not access storage'); });
  assert.equal(demo.getItem('vault'), null);
  demo.setItem('vault', 'fixture');
  const data = new Map([['vault', 'existing']]);
  const normal = previewStorage('', () => ({ getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) }));
  assert.equal(normal.getItem('vault'), 'existing');
  normal.setItem('vault', 'updated');
  assert.equal(data.get('vault'), 'updated');
});

test('AC-C-MR-03-01: preview pages use bundled fonts without remote CSS', async () => {
  for (const page of ['index.html', 'download.html', 'cloud.html', 'apps/mobile-preview/index.html']) {
    const html = await readFile(page, 'utf8');
    assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/, page);
    assert.match(html, /assets\/fonts\/fonts\.css/, page);
  }
  const css = await readFile('assets/fonts/fonts.css', 'utf8');
  assert.doesNotMatch(css, /https?:/);
  for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
    const bytes = await readFile(`assets/fonts/${match[1]}`);
    assert.ok(bytes.length > 1000, match[1]);
  }
});
