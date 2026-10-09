import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { executeThreeRunReleaseRehearsal } from '../../src/verification/rehearsal.ts';
import { redactVaultEntries, assertZeroSecretExposure } from '../../src/verification/redaction.ts';
import { MOCK_VAULT_ENTRIES, MOCK_RECOVERY_PHRASE_24_WORDS } from '../../src/verification/fixtures.ts';
import { OfflineLocalAIEngine } from '../../src/verification/offline-ai.ts';
import { DirectSyncDeviceNode } from '../../src/verification/direct-sync.ts';
import { scanDirectoryForPrivacy } from '../../src/verification/privacy-scanner.ts';
import * as path from 'node:path';

describe('Unified Verification Harness (Task E-MR-01 / Issue #11)', () => {
  it('AC-E-MR-01-01: Offline AI demo with Wi-Fi disabled passes', async () => {
    const ai = new OfflineLocalAIEngine({ disableNetwork: true });
    assert.strictEqual(ai.assertNetworkIsolated().isolated, true);
  });

  it('AC-E-MR-01-02: Redaction boundary proves zero denied secret fields exposed', () => {
    const redacted = redactVaultEntries(MOCK_VAULT_ENTRIES, true);
    const audit = assertZeroSecretExposure(redacted, MOCK_VAULT_ENTRIES, MOCK_RECOVERY_PHRASE_24_WORDS);
    assert.strictEqual(audit.clean, true);
  });

  it('AC-E-MR-01-03: Direct sync verifies change on Device A syncs to Device B', () => {
    const nodeA = new DirectSyncDeviceNode();
    const nodeB = new DirectSyncDeviceNode();
    nodeA.pairWithPeer(nodeB, 'unification-pair-secret');

    const deltas = nodeA.setEntry(MOCK_VAULT_ENTRIES[0]);
    const received = nodeB.receiveSyncDelta(deltas[0]);
    assert.strictEqual(received.id, MOCK_VAULT_ENTRIES[0].id);
  });

  it('AC-E-MR-01-04: Fixture and log privacy scan verifies zero real secrets in codebase', async () => {
    const root = path.resolve(import.meta.dirname, '../../');
    const result = await scanDirectoryForPrivacy(root);
    assert.strictEqual(result.clean, true);
  });

  it('AC-E-MR-01-05: P0 winning demo loop passes 3 consecutive runs cleanly', async () => {
    const rehearsal = await executeThreeRunReleaseRehearsal();
    assert.strictEqual(rehearsal.allPassed, true);
    assert.strictEqual(rehearsal.runs.length, 3);
  });
});
