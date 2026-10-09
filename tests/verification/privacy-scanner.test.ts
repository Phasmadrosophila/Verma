import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'node:path';
import {
  scanLogsForPrivacyViolations,
  scanFileContentForSecrets,
  scanDirectoryForPrivacy
} from '../../src/verification/privacy-scanner.ts';
import type { LogEvent } from '../../src/verification/types.ts';

describe('AC-E-MR-01-04: Fixture and Log Privacy Scanner', () => {
  it('should verify clean logs pass privacy audit without findings', () => {
    const cleanLogs: LogEvent[] = [
      {
        eventId: 'EVT-1001',
        category: 'AUTH',
        action: 'USER_LOGIN_SUCCESS',
        timestamp: Date.now(),
        status: 'SUCCESS',
        details: { attempts: 1 }
      },
      {
        eventId: 'EVT-1002',
        category: 'VAULT',
        action: 'ENTRY_SAVED',
        timestamp: Date.now(),
        status: 'SUCCESS',
        details: { entryId: 'entry-123', type: 'login' }
      },
      {
        eventId: 'EVT-1003',
        category: 'AI',
        action: 'QUERY_EXECUTED',
        timestamp: Date.now(),
        status: 'SUCCESS',
        details: { matchCount: 2 }
      }
    ];

    const result = scanLogsForPrivacyViolations(cleanLogs, ['mock-secret-password-val']);
    assert.strictEqual(result.clean, true);
    assert.strictEqual(result.findings.length, 0);
  });

  it('should detect raw secret leakage in log entries or string dumps', () => {
    const dirtyLogs = [
      'INFO: User unlocked entry-1 with password "my-super-secret-password-123"',
      JSON.stringify({ event: 'LEAK', secret: 'my-super-secret-password-123' })
    ];

    const result = scanLogsForPrivacyViolations(dirtyLogs, ['my-super-secret-password-123']);
    assert.strictEqual(result.clean, false);
    assert.ok(result.findings.length >= 2, 'Must flag both leaks');
    assert.ok(result.findings.some((f) => f.rule === 'RAW_SECRET_LEAK'));
  });

  it('should flag forbidden secret property names in structured LogEvent details', () => {
    const invalidLog: LogEvent = {
      eventId: 'EVT-ERR-01',
      category: 'VAULT',
      action: 'ENTRY_FAILED',
      timestamp: Date.now(),
      status: 'FAILURE',
      details: {
        password: 'unhashed-password-value'
      }
    };

    const result = scanLogsForPrivacyViolations([invalidLog]);
    assert.strictEqual(result.clean, false);
    assert.ok(result.findings.some((f) => f.rule === 'SECRET_KEY_IN_LOG_DETAILS'));
  });

  it('should detect high-risk real secret patterns such as AWS keys or GitHub tokens', () => {
    const fakeAwsKey = 'AK' + 'IAIOSFODNN7EXAMPLE';
    const fakeGithubPat = 'gh' + 'p_' + 'a'.repeat(36);

    const findingsAws = scanFileContentForSecrets(`export const KEY = "${fakeAwsKey}";`);
    assert.ok(findingsAws.length > 0, 'Must flag AWS Key pattern');
    assert.strictEqual(findingsAws[0].rule, 'HIGH_RISK_SECRET_PATTERN');

    const findingsPat = scanFileContentForSecrets(`const token = "${fakeGithubPat}";`);
    assert.ok(findingsPat.length > 0, 'Must flag GitHub PAT pattern');
  });

  it('should perform workspace privacy scan and confirm zero real secrets in repository files', async () => {
    const workspaceRoot = path.resolve(import.meta.dirname, '../../');
    const result = await scanDirectoryForPrivacy(workspaceRoot);

    assert.strictEqual(result.clean, true, `Found privacy violations in workspace: ${JSON.stringify(result.findings)}`);
    assert.ok(result.totalScanned > 5, 'Must have scanned repository source files');
  });
});
