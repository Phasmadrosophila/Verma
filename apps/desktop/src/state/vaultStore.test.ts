import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterEntries,
  findMetadata,
  generatePassword,
  seedEntries,
} from './vaultStore.js';

test('Mobile vaultStore: filterEntries filters by type and query', () => {
  const allLogins = filterEntries(seedEntries, '', 'login');
  assert.equal(allLogins.length, 4);
  assert.ok(allLogins.every((e) => e.type === 'login'));

  const netflixQuery = filterEntries(seedEntries, 'netflix', 'all');
  assert.equal(netflixQuery.length, 1);
  assert.equal(netflixQuery[0].title, 'Netflix');

  const emptyResult = filterEntries(seedEntries, 'nonexistent query 12345', 'all');
  assert.equal(emptyResult.length, 0);
});

test('Mobile vaultStore: findMetadata adheres to Zero-Secret security boundary', () => {
  // Query matching title and tags
  const results = findMetadata(seedEntries, 'Where is my Wi-Fi?');
  assert.ok(results.length > 0);
  assert.equal(results[0].entry.title, 'Home Wi-Fi');

  // Query matching alias
  const streamResults = findMetadata(seedEntries, 'streaming services');
  assert.ok(streamResults.length > 0);
  assert.equal(streamResults[0].entry.title, 'Netflix');

  // Invariant verification: Secret values MUST NOT be searchable or matched
  const secretLeaked = findMetadata(seedEntries, 'little-universe-4821');
  assert.equal(secretLeaked.length, 0, 'Secrets must NEVER be searchable by findMetadata');
});

test('Mobile vaultStore: generatePassword generates unique CSPRNG passwords', () => {
  const p1 = generatePassword(20);
  const p2 = generatePassword(20);
  assert.equal(p1.length, 20);
  assert.equal(p2.length, 20);
  assert.notEqual(p1, p2, 'Two generated passwords must be distinct');
});
