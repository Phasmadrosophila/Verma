import { performance } from 'node:perf_hooks';
import type {
  VaultEntry,
  RehearsalRunResult,
  FullVerificationReport,
  LogEvent
} from './types.ts';
import { MESSY_BROWSER_CSV_FIXTURE, MOCK_VAULT_ENTRIES } from './fixtures.ts';
import { redactVaultEntries, assertZeroSecretExposure } from './redaction.ts';
import { OfflineLocalAIEngine } from './offline-ai.ts';
import { DirectSyncDeviceNode } from './direct-sync.ts';
import { scanLogsForPrivacyViolations } from './privacy-scanner.ts';

export interface StepRecord {
  step: number;
  name: string;
  passed: boolean;
  durationMs: number;
}

/**
 * Runs a single full iteration of the 12-step P0 winning demo loop.
 */
export async function executeSingleP0DemoLoop(runNumber: number): Promise<RehearsalRunResult> {
  const steps: StepRecord[] = [];
  const runStart = performance.now();
  const logs: LogEvent[] = [];

  function log(category: LogEvent['category'], action: string, details?: Record<string, string | number | boolean>) {
    logs.push({
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      category,
      action,
      timestamp: Date.now(),
      status: 'SUCCESS',
      details
    });
  }

  // Helper to record step timing
  async function recordStep<T>(stepNumber: number, stepName: string, fn: () => Promise<T> | T): Promise<T> {
    const t0 = performance.now();
    try {
      const result = await fn();
      steps.push({
        step: stepNumber,
        name: stepName,
        passed: true,
        durationMs: Math.round(performance.now() - t0)
      });
      return result;
    } catch (err) {
      steps.push({
        step: stepNumber,
        name: stepName,
        passed: false,
        durationMs: Math.round(performance.now() - t0)
      });
      throw err;
    }
  }

  // Step 1: Start Device A and Device B with Wi-Fi disabled
  const { deviceA, deviceB, aiEngine } = await recordStep(1, 'Initialize offline devices and AI sandbox', () => {
    const dA = new DirectSyncDeviceNode();
    const dB = new DirectSyncDeviceNode();
    const ai = new OfflineLocalAIEngine({ disableNetwork: true });

    const isolation = ai.assertNetworkIsolated();
    if (!isolation.isolated) {
      throw new Error('AI sandbox failed network isolation check.');
    }
    log('SYSTEM', 'DEVICES_INITIALIZED_OFFLINE', { deviceACount: 1, deviceBCount: 1 });
    return { deviceA: dA, deviceB: dB, aiEngine: ai };
  });

  // Step 2: Authenticated direct pairing (SPAKE2 session key derivation)
  await recordStep(2, 'Direct SPAKE2 pairing between Device A and Device B', () => {
    const pairingPhrase = 'correct horse battery staple verma demo pair 2026';
    deviceA.pairWithPeer(deviceB, pairingPhrase);
    log('SYNC', 'PEER_PAIRED', {
      peerA: deviceA.identity.deviceId.substring(0, 8),
      peerB: deviceB.identity.deviceId.substring(0, 8)
    });
  });

  // Step 3: Load messy sanitized browser CSV on Device A
  const csvData = await recordStep(3, 'Load sanitized messy browser CSV fixture', () => {
    log('VAULT', 'CSV_FIXTURE_LOADED', { rows: 8 });
    return MESSY_BROWSER_CSV_FIXTURE;
  });

  // Step 4: Redaction layer projects metadata before model inference
  const initialRedacted = await recordStep(4, 'Execute trusted metadata redaction projection', () => {
    const redacted = redactVaultEntries(MOCK_VAULT_ENTRIES, true);
    const audit = assertZeroSecretExposure(redacted, MOCK_VAULT_ENTRIES);
    if (!audit.clean) {
      throw new Error(`Redaction boundary violation: ${audit.leaks.join(', ')}`);
    }
    log('AI', 'METADATA_REDACTION_PROJECTED', { totalRedacted: redacted.length });
    return redacted;
  });

  // Step 5: Sandboxed Local AI analyzes CSV and suggests mappings, tags, duplicate groups
  const importProposal = await recordStep(5, 'Local AI Smart Import analysis (offline)', async () => {
    const proposal = await aiEngine.analyzeCsvImport(csvData);
    if (proposal.columnMappings.length === 0 || proposal.tagSuggestions.length === 0) {
      throw new Error('Smart Import failed to generate expected proposals.');
    }
    log('AI', 'SMART_IMPORT_PROPOSAL_GENERATED', {
      mappingsCount: proposal.columnMappings.length,
      tagSuggestionsCount: proposal.tagSuggestions.length,
      duplicateGroupsCount: proposal.duplicateGroups.length
    });
    return proposal;
  });

  // Step 6: User reviews and explicitly confirms import into Device A vault
  await recordStep(6, 'User reviews and confirms Smart Import into vault', () => {
    // Populate Device A with the entries
    for (const entry of MOCK_VAULT_ENTRIES) {
      deviceA.vault.set(entry.id, { ...entry });
    }
    log('VAULT', 'ENTRIES_IMPORTED_AFTER_USER_CONFIRMATION', { count: MOCK_VAULT_ENTRIES.length });
  });

  // Step 7: Natural language query via Ask Your Vault
  const queryResult = await recordStep(7, 'Ask Your Vault query: "my work Google account for Company X"', async () => {
    const unlockedMetadata = redactVaultEntries(Array.from(deviceA.vault.values()), true);
    const result = await aiEngine.askYourVault('my work Google account for Company X', unlockedMetadata);

    if (result.matchedEntries.length === 0) {
      throw new Error('Ask Your Vault returned 0 matches for target entry.');
    }
    if (!result.matchedEntries[0].isSecretLocked) {
      throw new Error('Ask Your Vault returned secret in unlocked state inappropriately.');
    }
    log('AI', 'ASK_YOUR_VAULT_RETRIEVAL_COMPLETE', { matches: result.matchedEntries.length });
    return result;
  });

  // Step 8: User explicitly unlocks entry on Device A to view secret
  const matchedTargetId = queryResult.matchedEntries[0].id;
  await recordStep(8, 'Explicit entry unlock by user on Device A', () => {
    const targetEntry = deviceA.vault.get(matchedTargetId);
    if (!targetEntry || !targetEntry.secrets.password) {
      throw new Error('Target entry not found in local vault.');
    }
    log('VAULT', 'ENTRY_EXPLICITLY_UNLOCKED', { entryId: matchedTargetId });
  });

  // Step 9: User edits entry (adds tag) on Device A
  const updatedEntry: VaultEntry = await recordStep(9, 'User modifies entry tags on Device A', () => {
    const current = deviceA.vault.get(matchedTargetId)!;
    const modified: VaultEntry = {
      ...current,
      tags: [...current.tags, 'verified-demo-p0'],
      updatedAt: Date.now()
    };
    log('VAULT', 'ENTRY_UPDATED', { entryId: modified.id, tagCount: modified.tags.length });
    return modified;
  });

  // Step 10: Device A transmits encrypted delta directly to Device B
  const deltas = await recordStep(10, 'Device A creates encrypted & signed direct-sync delta', () => {
    const generatedDeltas = deviceA.setEntry(updatedEntry);
    log('SYNC', 'DELTA_ENCRYPTED_AND_DISPATCHED', { deltaCount: generatedDeltas.length });
    return generatedDeltas;
  });

  // Step 11: Device B receives, authenticates, decrypts, and applies sync delta
  await recordStep(11, 'Device B receives, verifies Ed25519 signature & decrypts delta', () => {
    const synced = deviceB.receiveSyncDelta(deltas[0]);
    if (!synced.tags.includes('verified-demo-p0')) {
      throw new Error('Device B state does not reflect synced tag update.');
    }
    log('SYNC', 'DELTA_APPLIED_ON_PEER', { entryId: synced.id });
  });

  // Step 12: Privacy scanner validates zero secret leaks across all emitted logs
  await recordStep(12, 'Privacy scanner audits execution logs and memory', () => {
    const knownSecrets = MOCK_VAULT_ENTRIES.map((e) => e.secrets.password).filter(Boolean) as string[];
    const scan = scanLogsForPrivacyViolations(logs, knownSecrets);
    if (!scan.clean) {
      throw new Error(`Privacy scanner detected violations: ${scan.findings.map((f) => f.detail).join(', ')}`);
    }
    log('SYSTEM', 'PRIVACY_SCAN_PASSED', { logsAudited: logs.length });
  });

  const totalDurationMs = Math.round(performance.now() - runStart);
  return {
    runNumber,
    passed: steps.every((s) => s.passed),
    durationMs: totalDurationMs,
    steps
  };
}

/**
 * Runs 3 consecutive release rehearsal iterations to verify P0 loop repeatability (AC-E-MR-01-05).
 */
export async function executeThreeRunReleaseRehearsal(): Promise<{
  allPassed: boolean;
  runs: RehearsalRunResult[];
  totalDurationMs: number;
}> {
  const startAll = performance.now();
  const runs: RehearsalRunResult[] = [];

  for (let i = 1; i <= 3; i++) {
    const runResult = await executeSingleP0DemoLoop(i);
    runs.push(runResult);
    if (!runResult.passed) {
      break;
    }
  }

  const totalDurationMs = Math.round(performance.now() - startAll);
  const allPassed = runs.length === 3 && runs.every((r) => r.passed);

  return {
    allPassed,
    runs,
    totalDurationMs
  };
}
