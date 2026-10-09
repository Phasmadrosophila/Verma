import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { DeadMansSwitch } from '../src/continuity/dead-mans-switch.js';

describe('AC-A-M3-01 Dead Man\'s Switch test mode', () => {
  const key = Buffer.alloc(32, 7);
  let currentTime = 1_000;
  const createSwitch = () => new DeadMansSwitch({
    now: () => currentTime,
    heartbeatTimeoutMs: 100,
    gracePeriodMs: 200,
  });

  it('approves an encrypted package and records no plaintext in the snapshot', () => {
    const testSwitch = createSwitch();
    const emergencyContent = 'FAKE TEST EMERGENCY CONTENT';
    const emergencyPackage = testSwitch.approvePackage('fake-recipient@example.test', emergencyContent, key);
    const snapshot = testSwitch.getSnapshot();

    assert.notEqual(emergencyPackage.encryptedContent.ciphertext, '');
    assert.equal(JSON.stringify(snapshot).includes(emergencyContent), false);
    assert.equal(snapshot.events[0]?.type, 'PACKAGE_APPROVED');
  });

  it('enters warning after a missed heartbeat, then permits cancellation', () => {
    const testSwitch = createSwitch();
    testSwitch.approvePackage('fake-recipient', 'FAKE CONTENT', key);
    currentTime += 101;
    assert.equal(testSwitch.evaluate(), 'WARNING');
    testSwitch.cancel();
    assert.equal(testSwitch.getSnapshot().state, 'CANCELLED');
    assert.deepEqual(testSwitch.getSnapshot().events.map((event) => event.type), [
      'PACKAGE_APPROVED', 'HEARTBEAT_MISSED', 'WARNING_ENTERED', 'CANCELLED',
    ]);
  });

  it('requires authenticated recipient release after the grace period and never returns plaintext automatically', () => {
    const testSwitch = createSwitch();
    testSwitch.approvePackage('fake-recipient', 'FAKE CONTENT', key);
    currentTime += 101;
    testSwitch.evaluate();
    assert.throws(() => testSwitch.authorizeRelease('wrong-recipient', DeadMansSwitch.recipientProof('wrong-recipient')));
    currentTime += 200;
    const receipt = testSwitch.authorizeRelease('fake-recipient', DeadMansSwitch.recipientProof('fake-recipient'));

    assert.equal('emergencyContent' in receipt, false);
    assert.equal(testSwitch.getSnapshot().state, 'RELEASED');
    assert.equal(DeadMansSwitch.decryptRelease(receipt, key).emergencyContent, 'FAKE CONTENT');
    assert.deepEqual(testSwitch.getSnapshot().events.map((event) => event.type), [
      'PACKAGE_APPROVED', 'HEARTBEAT_MISSED', 'WARNING_ENTERED', 'RELEASE_AUTHORIZED',
    ]);
  });

  it('rejects invalid key sizes and disallows heartbeat after cancellation', () => {
    const testSwitch = createSwitch();
    assert.throws(() => testSwitch.approvePackage('fake-recipient', 'FAKE CONTENT', Buffer.alloc(16)));
    testSwitch.approvePackage('fake-recipient', 'FAKE CONTENT', key);
    currentTime += 101;
    testSwitch.cancel();
    assert.throws(() => testSwitch.heartbeat());
  });
});
