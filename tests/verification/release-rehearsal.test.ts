import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  executeSingleP0DemoLoop,
  executeThreeRunReleaseRehearsal
} from '../../src/verification/rehearsal.ts';

describe('AC-E-MR-01-05: P0 Demo Loop 3-Run Release Rehearsal', () => {
  it('should successfully execute all 12 steps of the P0 winning demo loop in a single run', async () => {
    const singleRun = await executeSingleP0DemoLoop(1);

    assert.strictEqual(singleRun.passed, true, 'P0 loop must pass all steps');
    assert.strictEqual(singleRun.steps.length, 12, 'P0 loop must have exactly 12 steps');

    for (const step of singleRun.steps) {
      assert.strictEqual(step.passed, true, `Step ${step.step} "${step.name}" must pass`);
      assert.ok(step.durationMs >= 0, 'Step duration must be non-negative');
    }

    assert.ok(singleRun.durationMs < 5000, `Single run duration (${singleRun.durationMs}ms) must be under 5s`);
  });

  it('should complete three consecutive rehearsal runs with zero failures (Release Gate)', async () => {
    const rehearsal = await executeThreeRunReleaseRehearsal();

    assert.strictEqual(rehearsal.allPassed, true, 'All 3 rehearsal runs must pass');
    assert.strictEqual(rehearsal.runs.length, 3, 'Must record 3 complete runs');

    rehearsal.runs.forEach((run, index) => {
      assert.strictEqual(run.runNumber, index + 1);
      assert.strictEqual(run.passed, true, `Run #${run.runNumber} must pass`);
      assert.strictEqual(run.steps.length, 12, `Run #${run.runNumber} must have 12 steps`);
    });

    assert.ok(rehearsal.totalDurationMs > 0);
  });
});
