import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [landing, download, downloadStyles, server] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../download.html', import.meta.url), 'utf8'),
  readFile(new URL('../download.css', import.meta.url), 'utf8'),
  readFile(new URL('../server.mjs', import.meta.url), 'utf8'),
]);

assert.equal((landing.match(/href="\/download"/g) || []).length, 2, 'Landing desktop and mobile downloads route to /download');
assert.equal((download.match(/class="deployment-card/g) || []).length, 3, 'Download page has three deployment choices');
assert.match(download, /Verma Local[\s\S]*FOR HOMELABBERS[\s\S]*Self-hosted[\s\S]*FOR ORGANIZATIONS[\s\S]*Enterprise/);
assert.match(download, /Enterprise remains a future product direction|Not part of the hackathon MVP/);
assert.match(download, /type="button" disabled>Not yet available<\/button>/);
assert.match(downloadStyles, /@media\(max-width:680px\)/, 'Download page has a mobile breakpoint');
assert.match(downloadStyles, /@media\(max-width:360px\)/, 'Download page supports 320px-class screens');
assert.match(downloadStyles, /deployment-card-shine/, 'Download page cards have hover shiny effect');
assert.match(server, /pathname === '\/download'/);

console.log('Download page checks passed');
