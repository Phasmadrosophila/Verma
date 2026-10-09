import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TrustedRedactionBoundary,
  FakeLocalAiAdapter,
  VaultLockedError,
  RedactionSecurityError,
  DENIED_SECRET_FIELD_KEYS,
} from '../src/redaction/index.js';
import type { LoginEntry, NoteEntry, ApiKeyEntry, VaultEntry } from '../src/types/entry.js';

describe('AC-B-M1-01-01: Trusted-Layer Boundary Test with Fake Model Adapter', () => {
  const sampleLogin: LoginEntry = {
    id: 'login-boundary-01',
    type: 'login',
    title: 'Acme SSO Portal',
    username: 'alice@corp.internal',
    password: 'SuperSecretPlaintextPassword!99',
    url: 'https://sso.corp.internal/login',
    domain: 'sso.corp.internal',
    totpSecret: 'MFRGGZDFMY======',
    recoveryCodes: ['RECOV-111', 'RECOV-222'],
    tags: ['work', 'sso'],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  const sampleNote: NoteEntry = {
    id: 'note-boundary-02',
    type: 'note',
    title: 'Infra SSH Keys',
    content: 'Very confidential private note body with server access commands',
    category: 'infrastructure',
    tags: ['ops'],
    createdAt: 1700000050000,
    updatedAt: 1700000050000,
  };

  const sampleApiKey: ApiKeyEntry = {
    id: 'api-boundary-03',
    type: 'api_key',
    title: 'OpenAI API Token',
    service: 'openai',
    apiKey: 'sk-proj-very-secret-token-value-xyz',
    apiSecret: 'secret-signing-key-xyz',
    tags: ['ai', 'prod'],
    createdAt: 1700000100000,
    updatedAt: 1700000100000,
  };

  it('should run redaction in trusted boundary before invoking fake model adapter', async () => {
    const fakeAdapter = new FakeLocalAiAdapter();
    const boundary = new TrustedRedactionBoundary({ adapter: fakeAdapter });

    const entries: VaultEntry[] = [sampleLogin, sampleNote, sampleApiKey];
    const prompt = 'Find the credentials for my OpenAI project';

    const response = await boundary.invokeModel(prompt, entries, false);

    assert.ok(response);
    assert.equal(fakeAdapter.getCallCount(), 1);

    const recordedRequest = fakeAdapter.getLastRequest()!;
    assert.equal(recordedRequest.prompt, prompt);
    assert.equal(recordedRequest.context.length, 3);

    // Verify context items contain only metadata
    const loginMeta = recordedRequest.context.find((c) => c.id === sampleLogin.id)!;
    assert.equal(loginMeta.title, 'Acme SSO Portal');
    assert.equal(loginMeta.domain, 'sso.corp.internal');
    assert.deepEqual(loginMeta.tags, ['work', 'sso']);

    // Check no secret field keys reached the fake adapter
    for (const contextItem of recordedRequest.context) {
      for (const deniedKey of DENIED_SECRET_FIELD_KEYS) {
        assert.equal(
          (contextItem as any)[deniedKey],
          undefined,
          `Fake adapter context item must not contain denied key: ${deniedKey}`
        );
      }
    }

    // Check no secret field values reached the fake adapter in JSON serialization
    const serializedContext = JSON.stringify(recordedRequest.context);
    assert.ok(!serializedContext.includes(sampleLogin.password));
    assert.ok(!serializedContext.includes(sampleLogin.totpSecret!));
    assert.ok(!serializedContext.includes('RECOV-111'));
    assert.ok(!serializedContext.includes(sampleNote.content));
    assert.ok(!serializedContext.includes(sampleApiKey.apiKey));
    assert.ok(!serializedContext.includes(sampleApiKey.apiSecret!));
  });

  it('should reject inference when boundary detects vault is locked', async () => {
    const fakeAdapter = new FakeLocalAiAdapter();
    const boundary = new TrustedRedactionBoundary({ adapter: fakeAdapter });

    const entries: VaultEntry[] = [sampleLogin];

    await assert.rejects(
      async () => {
        await boundary.invokeModel('Search vault', entries, true);
      },
      (err: Error) => {
        assert.ok(err instanceof VaultLockedError);
        assert.match(err.message, /locked/i);
        return true;
      }
    );

    // Assert fake adapter was never called
    assert.equal(fakeAdapter.getCallCount(), 0);
  });
});
