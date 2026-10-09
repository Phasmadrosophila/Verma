import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_SYNTHETIC_ENTRIES,
  SYNTHETIC_LOGINS,
  SYNTHETIC_NOTES,
  SYNTHETIC_API_KEYS,
  scanFixturesForPrivacy,
} from '../src/fixtures/index.js';
import { SafeLogger } from '../src/logging/index.js';

describe('Synthetic Fixtures & Privacy Boundaries', () => {
  it('should contain all required P0 entry types in synthetic fixture dataset', () => {
    assert.ok(SYNTHETIC_LOGINS.length >= 3);
    assert.ok(SYNTHETIC_NOTES.length >= 3);
    assert.ok(SYNTHETIC_API_KEYS.length >= 3);
    assert.equal(
      ALL_SYNTHETIC_ENTRIES.length,
      SYNTHETIC_LOGINS.length + SYNTHETIC_NOTES.length + SYNTHETIC_API_KEYS.length
    );
  });

  it('should pass automated privacy scan with zero live credential patterns', () => {
    const report = scanFixturesForPrivacy();
    assert.equal(report.passed, true, `Privacy scan failed: ${report.findings.join(', ')}`);
    assert.equal(report.liveCredentialMatches.length, 0);
    assert.ok(report.syntheticMarkerCount > 0);
  });

  it('should sanitize logged objects and never leak secret fields to log streams', () => {
    const logger = new SafeLogger();

    logger.info('TEST_EVENT', {
      entryId: 'test-id',
      meta: {
        password: 'LeakedPassword123!',
        apiKey: 'sk_secret_value',
        content: 'Secret note body',
        safeProperty: 'AllowedValue',
        nested: {
          totpSecret: 'JBSWY3DPEHPK3PXP',
          safeNested: 'NestedAllowed',
        },
      },
    });

    const events = logger.getLoggedEvents();
    assert.equal(events.length, 1);
    const event = events[0];

    assert.equal(event.meta?.password, '[REDACTED_SECRET]');
    assert.equal(event.meta?.apiKey, '[REDACTED_SECRET]');
    assert.equal(event.meta?.content, '[REDACTED_SECRET]');
    assert.equal(event.meta?.safeProperty, 'AllowedValue');
    assert.equal((event.meta?.nested as any)?.totpSecret, '[REDACTED_SECRET]');
    assert.equal((event.meta?.nested as any)?.safeNested, 'NestedAllowed');

    const serialized = JSON.stringify(events);
    assert.ok(!serialized.includes('LeakedPassword123!'));
    assert.ok(!serialized.includes('sk_secret_value'));
    assert.ok(!serialized.includes('Secret note body'));
    assert.ok(!serialized.includes('JBSWY3DPEHPK3PXP'));
  });
});
