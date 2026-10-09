import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SYNTHETIC_ASK_VAULT_FIXTURES,
  SYNTHETIC_IMPORT_MAPPING_FIXTURES,
  SYNTHETIC_TAG_SUGGESTION_FIXTURES,
  SYNTHETIC_HEALTH_EXPLANATION_FIXTURES,
} from '../src/redaction/evaluation-fixtures.js';
import { DENIED_SECRET_FIELD_KEYS } from '../src/redaction/constants.js';

describe('AC-B-M1-05-02 & AC-B-M1-05-04: Local Model Evaluation Fixtures & Schema Validation', () => {
  it('should guarantee zero denied secret keys present in synthetic ask-vault evaluation metadata', () => {
    assert.ok(SYNTHETIC_ASK_VAULT_FIXTURES.length >= 2);

    for (const fixture of SYNTHETIC_ASK_VAULT_FIXTURES) {
      assert.ok(fixture.id);
      assert.ok(fixture.query);
      assert.ok(fixture.metadata.length > 0);

      for (const entry of fixture.metadata) {
        for (const deniedKey of DENIED_SECRET_FIELD_KEYS) {
          assert.equal((entry as any)[deniedKey], undefined, `Field ${deniedKey} must not exist in metadata`);
        }
      }
    }
  });

  it('should validate import-mapping evaluation fixtures for column schema suggestions', () => {
    assert.ok(SYNTHETIC_IMPORT_MAPPING_FIXTURES.length >= 2);

    for (const fixture of SYNTHETIC_IMPORT_MAPPING_FIXTURES) {
      assert.ok(fixture.rawHeaders.length > 0);
      assert.ok(fixture.expectedMappings);
      for (const [header, mappedField] of Object.entries(fixture.expectedMappings)) {
        assert.ok(['username', 'password', 'url', 'title', 'notes', 'tags', 'ignored'].includes(mappedField));
      }
    }
  });

  it('should validate tag-suggestion evaluation fixtures', () => {
    assert.ok(SYNTHETIC_TAG_SUGGESTION_FIXTURES.length >= 2);

    for (const fixture of SYNTHETIC_TAG_SUGGESTION_FIXTURES) {
      assert.ok(fixture.serviceDomain);
      assert.ok(fixture.suggestedTags.length > 0);
    }
  });

  it('should validate health-explanation evaluation fixtures for deterministic findings', () => {
    assert.ok(SYNTHETIC_HEALTH_EXPLANATION_FIXTURES.length >= 3);

    for (const fixture of SYNTHETIC_HEALTH_EXPLANATION_FIXTURES) {
      assert.ok(fixture.title);
      assert.ok(['low', 'medium', 'high'].includes(fixture.expectedUrgency));
    }
  });
});
