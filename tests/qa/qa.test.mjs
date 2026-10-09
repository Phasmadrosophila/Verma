import test from 'node:test';
import assert from 'node:assert/strict';
import { executeQaTestHarness } from '../../scripts/testing/qa-test.mjs';

test('Phase 2C Automated QA Acceptance Criteria Verification Suite', async () => {
  const report = await executeQaTestHarness();
  assert.equal(report.failedTests, 0, `QA test harness had ${report.failedTests} failing tests`);
  assert.ok(report.totalTests >= 25, `Expected at least 25 QA test assertions, got ${report.totalTests}`);
  assert.equal(report.passRatePct, '100.00', 'Pass rate must be strictly 100.00%');
});
