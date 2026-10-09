import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveBrand,
  getApiBaseUrl,
  setApiBaseUrl,
  toMobileEntry,
  toWireEntryInput,
  mobileApi,
} from './apiClient';
import type {
  LoginEntry,
  NoteEntry,
  ApiKeyEntry,
  RedactedEntryMetadata,
} from '@app/shared';

test('apiClient: Base URL configuration and custom setter', () => {
  const original = getApiBaseUrl();
  setApiBaseUrl('http://192.168.1.42:3000/');
  assert.equal(getApiBaseUrl(), 'http://192.168.1.42:3000');

  setApiBaseUrl('http://localhost:3000');
  assert.equal(getApiBaseUrl(), 'http://localhost:3000');
});

test('apiClient: deriveBrand produces clean lowercase brand strings', () => {
  assert.equal(deriveBrand('GitHub!'), 'github');
  assert.equal(deriveBrand('Google Workspace'), 'googleworkspace');
  assert.equal(deriveBrand('1Password'), '1password');
  assert.equal(deriveBrand('???'), 'key');
});

test('apiClient: toMobileEntry converts LoginEntry with secret', () => {
  const login: LoginEntry = {
    id: 'login-1',
    type: 'login',
    title: 'ProtonMail',
    username: 'user@pm.me',
    password: 'secret-proton-pass-999',
    domain: 'proton.me',
    tags: ['Email', 'Security'],
    createdAt: Date.now() - 60000,
    updatedAt: Date.now() - 60000,
  };

  const mobile = toMobileEntry(login);
  assert.equal(mobile.id, 'login-1');
  assert.equal(mobile.type, 'login');
  assert.equal(mobile.title, 'ProtonMail');
  assert.equal(mobile.user, 'user@pm.me');
  assert.equal(mobile.domain, 'proton.me');
  assert.deepEqual(mobile.tags, ['Email', 'Security']);
  assert.equal(mobile.secret, 'secret-proton-pass-999');
  assert.equal(mobile.brand, 'protonmail');
  assert.match(mobile.updated, /1m ago|Just now/);
});

test('apiClient: toMobileEntry converts NoteEntry with secret', () => {
  const note: NoteEntry = {
    id: 'note-1',
    type: 'note',
    title: 'Passport Info',
    content: 'Passport # 123456789',
    category: 'Personal',
    tags: ['Documents'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mobile = toMobileEntry(note);
  assert.equal(mobile.id, 'note-1');
  assert.equal(mobile.type, 'note');
  assert.equal(mobile.title, 'Passport Info');
  assert.equal(mobile.subtitle, 'Personal');
  assert.equal(mobile.secret, 'Passport # 123456789');
  assert.deepEqual(mobile.tags, ['Documents']);
});

test('apiClient: toMobileEntry converts ApiKeyEntry with secret and maps type to "api"', () => {
  const apiKey: ApiKeyEntry = {
    id: 'api-1',
    type: 'api_key',
    title: 'Stripe Secret Key',
    service: 'Stripe Payments',
    apiKey: 'sk_live_1234567890',
    tags: ['Billing'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mobile = toMobileEntry(apiKey);
  assert.equal(mobile.id, 'api-1');
  assert.equal(mobile.type, 'api');
  assert.equal(mobile.title, 'Stripe Secret Key');
  assert.equal(mobile.subtitle, 'Stripe Payments');
  assert.equal(mobile.secret, 'sk_live_1234567890');
});

test('apiClient: toMobileEntry enforces Zero-Secret boundary for RedactedEntryMetadata', () => {
  const redacted: RedactedEntryMetadata = {
    id: 'meta-1',
    type: 'login',
    title: 'Bank Portal',
    domain: 'mybank.com',
    tags: ['Finance'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isReused: false,
    isWeak: false,
    fieldLabels: ['username', 'password'],
  };

  const mobile = toMobileEntry(redacted);
  assert.equal(mobile.id, 'meta-1');
  assert.equal(mobile.type, 'login');
  assert.equal(mobile.title, 'Bank Portal');
  assert.equal(mobile.domain, 'mybank.com');
  // Invariant: Redacted metadata must NEVER contain secret payload
  assert.equal(mobile.secret, '', 'Redacted metadata must have empty secret string');
});

test('apiClient: toWireEntryInput formats payloads correctly for backend API', () => {
  // Login entry
  const loginInput = toWireEntryInput({
    title: 'Amazon',
    type: 'login',
    user: 'shopper@example.com',
    domain: 'amazon.com',
    tags: ['Shopping'],
    secret: 'amz-password-777',
    favorite: true,
    brand: 'amazon',
    subtitle: 'Shopping account',
  });
  assert.equal(loginInput.type, 'login');
  assert.equal(loginInput.title, 'Amazon');
  assert.equal((loginInput as any).username, 'shopper@example.com');
  assert.equal((loginInput as any).password, 'amz-password-777');

  // API entry
  const apiInput = toWireEntryInput({
    title: 'OpenAI API',
    type: 'api',
    user: 'OpenAI',
    tags: ['AI'],
    secret: 'sk-abcdef12345',
    favorite: false,
    brand: 'openai',
    subtitle: 'LLM Key',
  });
  assert.equal(apiInput.type, 'api_key');
  assert.equal((apiInput as any).service, 'OpenAI');
  assert.equal((apiInput as any).apiKey, 'sk-abcdef12345');

  // Note entry
  const noteInput = toWireEntryInput({
    title: 'Locker Combination',
    type: 'note',
    tags: ['Home'],
    secret: '12-34-56',
    favorite: false,
    brand: 'key',
    subtitle: 'Padlock',
  });
  assert.equal(noteInput.type, 'note');
  assert.equal((noteInput as any).content, '12-34-56');
});

test('apiClient: mobileApi handles offline mode gracefully without crashing', async () => {
  // Save current base URL and point to an offline unreachable port
  const original = getApiBaseUrl();
  setApiBaseUrl('http://127.0.0.1:59998');

  try {
    const isHealthy = await mobileApi.checkHealth();
    assert.equal(isHealthy, false, 'checkHealth must return false when backend is down');

    const statusRes = await mobileApi.getVaultStatus();
    assert.equal(statusRes.success, false);
    assert.equal(statusRes.isOffline, true, 'Result must indicate offline state');

    const listRes = await mobileApi.listEntries();
    assert.equal(listRes.success, false);
    assert.equal(listRes.isOffline, true);

    const askRes = await mobileApi.askVault('where is my wifi');
    assert.equal(askRes.success, false);
    assert.equal(askRes.isOffline, true);
  } finally {
    setApiBaseUrl(original);
  }
});
