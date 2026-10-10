import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterEntries,
  findMetadata,
  generatePassword,
  MobileVaultEntry
} from './vaultStore';

const mockEntries: MobileVaultEntry[] = [
  {
    id: 1,
    type: 'login',
    title: 'Google',
    subtitle: 'Work account',
    user: 'sam@companyx.example',
    domain: 'accounts.google.com',
    tags: ['Work', 'Company X'],
    favorite: true,
    brand: 'google',
    secret: 'kR9#mP2$vX5@wL8*',
    updated: 'Today',
  },
  {
    id: 2,
    type: 'login',
    title: 'GitHub',
    subtitle: 'A home for your ideas',
    user: 'sam-dev',
    domain: 'github.com',
    tags: ['Development'],
    favorite: true,
    brand: 'github',
    secret: 'ghp_K9mX2bL8vP5wQ1zR7yT4nS6uV3jH0aB',
    updated: 'Yesterday',
  },
  {
    id: 3,
    type: 'login',
    title: 'Netflix',
    subtitle: 'Family account',
    user: 'family@example.com',
    domain: 'netflix.com',
    tags: ['Personal', 'Streaming'],
    favorite: true,
    brand: 'netflix',
    secret: 'tN4!mY8#qW2^zV5~',
    updated: '3 days ago',
  },
  {
    id: 4,
    type: 'login',
    title: 'Google',
    subtitle: 'Personal account',
    user: 'sam.personal@example.com',
    domain: 'accounts.google.com',
    tags: ['Personal'],
    favorite: false,
    brand: 'google',
    secret: 'vR8#bM3$nQ6@wK9*',
    updated: '3 days ago',
  },
  {
    id: 6,
    type: 'note',
    title: 'Home Wi-Fi',
    subtitle: 'The good connection',
    user: 'Home network',
    domain: '192.168.1.1',
    tags: ['Home', 'Network'],
    favorite: false,
    brand: 'wifi',
    secret: 'Network SSID: Verma-Private-5G\nWPA3 Key: little-universe-4821\nRouter Admin: https://192.168.1.1',
    updated: '1 month ago',
  },
];

test('Mobile vaultStore: filterEntries filters by type and query', () => {
  const allLogins = filterEntries(mockEntries, '', 'login');
  assert.equal(allLogins.length, 4);
  assert.ok(allLogins.every((e) => e.type === 'login'));

  const netflixQuery = filterEntries(mockEntries, 'netflix', 'all');
  assert.equal(netflixQuery.length, 1);
  assert.equal(netflixQuery[0].title, 'Netflix');

  const emptyResult = filterEntries(mockEntries, 'nonexistent query 12345', 'all');
  assert.equal(emptyResult.length, 0);
});

test('Mobile vaultStore: findMetadata adheres to Zero-Secret security boundary', () => {
  // Query matching title and tags
  const results = findMetadata(mockEntries, 'Where is my Wi-Fi?');
  assert.ok(results.length > 0);
  assert.equal(results[0].entry.title, 'Home Wi-Fi');

  // Query matching alias
  const streamResults = findMetadata(mockEntries, 'streaming services');
  assert.ok(streamResults.length > 0);
  assert.equal(streamResults[0].entry.title, 'Netflix');

  // Invariant verification: Secret values MUST NOT be searchable or matched
  const secretLeaked = findMetadata(mockEntries, 'little-universe-4821');
  assert.equal(secretLeaked.length, 0, 'Secrets must NEVER be searchable by findMetadata');
});

test('Mobile vaultStore: generatePassword generates unique CSPRNG passwords', () => {
  const p1 = generatePassword(20);
  const p2 = generatePassword(20);
  assert.equal(p1.length, 20);
  assert.equal(p2.length, 20);
  assert.notEqual(p1, p2, 'Two generated passwords must be distinct');
});
