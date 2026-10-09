import test from 'node:test';
import assert from 'node:assert/strict';
import { seedEntries, sampleImport, filterEntries, findMetadata, prepareImport, generatePassword, escapeHtml } from '../vault.js';

test('vault filters combine type and search without mutating entries', () => {
  assert.equal(filterEntries(seedEntries, 'GOOGLE work', 'login')[0].id, 1);
  assert.equal(filterEntries(seedEntries, 'google', 'api').length, 0);
  assert.equal(filterEntries(seedEntries, '', 'favorite').length, 3);
  assert.equal(seedEntries.length, 6);
});

test('assistant matches natural clues and excludes secrets and note bodies', () => {
  assert.equal(findMetadata(seedEntries, 'my work Google account')[0].entry.id, 1);
  assert.equal(findMetadata(seedEntries, 'our family streaming account')[0].entry.id, 3);
  const fixtures = [{ ...seedEntries[0], secret: 'uniquesecret', user: 'privateusername', tags: ['Work'] }];
  assert.deepEqual(findMetadata(fixtures, 'uniquesecret'), []);
  assert.deepEqual(findMetadata(fixtures, 'privateusername'), []);
  assert.deepEqual(findMetadata(fixtures, 'the my account'), []);
});

test('import requires a duplicate decision and only saves accepted tags', () => {
  const rows = sampleImport.map((r, i) => ({ ...r, accepted: i === 0 }));
  assert.throws(() => prepareImport(rows, '', 100), /duplicate/);
  const skipped = prepareImport(rows, 'skip', 100);
  assert.equal(skipped.length, 6);
  assert.deepEqual(skipped[0].tags, ['Work']);
  assert.deepEqual(skipped[1].tags, []);
  assert.equal(skipped.at(-1).id, 105);
  assert.equal(prepareImport(rows, 'keep', 100).length, 7);
  assert.equal(rows.length, 7);
});

test('untrusted labels are safe to insert in text and quoted attributes', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">&\''), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;');
});

test('password generator returns fresh values with the requested length', () => {
  const generated = Array.from({ length: 30 }, () => generatePassword());
  assert.equal(new Set(generated).size, 30);
  assert.ok(generated.every(value => value.length === 20 && /^[A-Za-z2-9!@#_-]+$/.test(value)));
});
