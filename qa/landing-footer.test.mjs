import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [landing, cloud, download] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../cloud.html', import.meta.url), 'utf8'),
  readFile(new URL('../download.html', import.meta.url), 'utf8'),
]);

const expectedCopyright = '© 2026 Verma. All rights reserved.';
const expectedAuthor = 'Made by Phasmadrosophilia';

for (const [name, html] of [['Landing', landing], ['Cloud', cloud], ['Download', download]]) {
  assert(html.includes(expectedCopyright), `${name} page includes copyright: "${expectedCopyright}"`);
  assert(html.includes(expectedAuthor), `${name} page includes author: "${expectedAuthor}"`);
}

console.log('All landing page footer checks passed');
