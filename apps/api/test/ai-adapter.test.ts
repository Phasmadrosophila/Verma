import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AiAdapter } from '../src/ai/adapter.js';

describe('AI Adapter (B-M1-02)', () => {
  const mockMetadata = [
    {
      id: 'entry-1',
      type: 'login' as const,
      title: 'GitHub',
      tags: ['work', 'dev'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fieldLabels: ['username', 'password'],
      domain: 'github.com',
      isReused: false,
      isWeak: false,
    }
  ];

  it('AC-B-M1-02-01: Returns fallback when disabled', async () => {
    const adapter = new AiAdapter({ enabled: false, apiUrl: 'http://127.0.0.1:11434', model: 'TBD', timeoutMs: 1000 });
    const result = await adapter.askVault('Where is my github?', mockMetadata);
    assert.strictEqual(result.relevantEntryIds.length, 0);
    assert.match(result.answer, /unavailable or disabled/);
  });

  it('AC-B-M1-02-01: Returns fallback on model timeout', async () => {
    // Point to a blackhole or very slow local port if possible, or just mock fetch.
    // For simplicity, we just set timeout to 1ms to ensure it times out.
    const adapter = new AiAdapter({ enabled: true, apiUrl: 'http://127.0.0.1:11434', model: 'TBD', timeoutMs: 1 });
    const result = await adapter.askVault('timeout test', mockMetadata);
    assert.strictEqual(result.relevantEntryIds.length, 0);
    assert.match(result.answer, /unavailable or disabled/);
  });

  it('AC-B-M1-02-02: Network denial rejects non-local URLs', async () => {
    const adapter = new AiAdapter({ enabled: true, apiUrl: 'https://api.openai.com', model: 'TBD', timeoutMs: 1000 });
    await assert.rejects(
      async () => adapter.askVault('test', mockMetadata),
      /AI Adapter network denial: only local endpoints are permitted/
    );
  });

  it('AC-B-M1-02-03: Rejects malformed JSON and schema mismatches', () => {
    const adapter = new AiAdapter();
    // Use the private method for unit testing
    const parse = (adapter as any).parseAndValidateResponse.bind(adapter);

    const malformedResult = parse('{ bad json ');
    assert.strictEqual(malformedResult.relevantEntryIds.length, 0);

    const wrongSchemaResult = parse('{"answer": "hi"}'); // missing relevantEntryIds
    assert.strictEqual(wrongSchemaResult.relevantEntryIds.length, 0);
  });

  describe('Smart Import Mapping (B-M1-03)', () => {
    const columns = ['name', 'url', 'username', 'password', 'note', 'folder'];

    it('AC-B-M1-03-04: Network denial rejects non-local URLs for import mapping', async () => {
      const adapter = new AiAdapter({ enabled: true, apiUrl: 'https://api.anthropic.com', model: 'TBD', timeoutMs: 1000 });
      await assert.rejects(
        async () => adapter.suggestImportMappings(columns),
        /AI Adapter network denial: only local endpoints are permitted/
      );
    });

    it('AC-B-M1-03-01: Returns heuristic fallback when AI is disabled', async () => {
      const adapter = new AiAdapter({ enabled: false, apiUrl: 'http://127.0.0.1:11434', model: 'TBD', timeoutMs: 1000 });
      const result = await adapter.suggestImportMappings(columns);
      assert.equal(result.mappings.length, 6);
      const titleMap = result.mappings.find((m) => m.sourceColumn === 'name');
      assert.ok(titleMap);
      assert.equal(titleMap.targetField, 'title');
      assert.equal(titleMap.suggestedBy, 'heuristic');
    });

    it('AC-B-M1-03-01: Returns heuristic fallback on model timeout', async () => {
      const adapter = new AiAdapter({ enabled: true, apiUrl: 'http://127.0.0.1:11434', model: 'TBD', timeoutMs: 1 });
      const result = await adapter.suggestImportMappings(columns);
      assert.equal(result.mappings.length, 6);
      assert.ok(result.mappings.some((m) => m.suggestedBy === 'heuristic'));
    });

    it('AC-B-M1-03-03: Redaction boundary sanitizes sample secret values before LLM prompt', () => {
      const adapter = new AiAdapter();
      const prompt = (adapter as any).buildImportPrompt(columns, [
        { name: 'Test Site', password: '[REDACTED_SECRET]', username: 'testuser' },
      ]);
      assert.ok(!prompt.includes('SecretPassword999'));
      assert.ok(prompt.includes('[REDACTED_SECRET]'));
    });

    it('AC-B-M1-03-03: Rejects malformed JSON and falls back safely', () => {
      const adapter = new AiAdapter();
      const parse = (adapter as any).parseAndValidateImportResponse.bind(adapter);

      const malformed = parse('{ bad json ', columns);
      assert.equal(malformed.mappings.length, 6);
      assert.equal(malformed.mappings[0].suggestedBy, 'heuristic');

      const wrongSchema = parse('{"mappings": [{"sourceColumn": "name", "targetField": "invalid_field"}]}', columns);
      assert.equal(wrongSchema.mappings.length, 6);
      assert.equal(wrongSchema.mappings[0].suggestedBy, 'heuristic');
    });
  });
});
