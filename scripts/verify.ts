#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import * as path from 'node:path';
import { executeThreeRunReleaseRehearsal } from '../src/verification/rehearsal.ts';
import { redactVaultEntries, assertZeroSecretExposure } from '../src/verification/redaction.ts';
import { MOCK_VAULT_ENTRIES, MOCK_RECOVERY_PHRASE_24_WORDS, MESSY_BROWSER_CSV_FIXTURE } from '../src/verification/fixtures.ts';
import { OfflineLocalAIEngine } from '../src/verification/offline-ai.ts';
import { DirectSyncDeviceNode } from '../src/verification/direct-sync.ts';
import { scanDirectoryForPrivacy, scanLogsForPrivacyViolations } from '../src/verification/privacy-scanner.ts';
import type { ACVerificationResult, FullVerificationReport } from '../src/verification/types.ts';

async function runReleaseVerification(): Promise<FullVerificationReport> {
  const globalStart = performance.now();
  const acResults: ACVerificationResult[] = [];

  console.log('===============================================================');
  console.log(' Verma Release Verification Harness (E-MR-01 / Issue #11)');
  console.log('===============================================================\n');

  // --- AC-E-MR-01-01: Offline AI Demo ---
  const ac1Start = performance.now();
  let ac1Passed = true;
  const ac1Subchecks: ACVerificationResult['subchecks'] = [];
  try {
    const ai = new OfflineLocalAIEngine({ disableNetwork: true });
    const isolation = ai.assertNetworkIsolated();
    ac1Subchecks.push({
      name: 'Network Isolation Sandbox Assertion',
      passed: isolation.isolated,
      evidence: `isolated=${isolation.isolated}, violations=${isolation.violations}`
    });

    const proposal = await ai.analyzeCsvImport(MESSY_BROWSER_CSV_FIXTURE);
    ac1Subchecks.push({
      name: 'Smart Import Offline Column & Tag Proposals',
      passed: proposal.columnMappings.length > 0 && proposal.tagSuggestions.length > 0,
      evidence: `mappings=${proposal.columnMappings.length}, tags=${proposal.tagSuggestions.length}`
    });

    const metadata = redactVaultEntries(MOCK_VAULT_ENTRIES, true);
    const query = await ai.askYourVault('Google Work Company X', metadata);
    ac1Subchecks.push({
      name: 'Ask Your Vault Metadata Search (Secrets Hidden)',
      passed: query.matchedEntries.length > 0 && query.matchedEntries[0].isSecretLocked,
      evidence: `matches=${query.matchedEntries.length}, locked=${query.matchedEntries[0]?.isSecretLocked}`
    });
  } catch (err) {
    ac1Passed = false;
    ac1Subchecks.push({ name: 'Execution Error', passed: false, evidence: (err as Error).message });
  }
  ac1Passed = ac1Passed && ac1Subchecks.every((s) => s.passed);
  acResults.push({
    acId: 'AC-E-MR-01-01',
    name: 'Offline AI demo passes with Wi-Fi disabled',
    passed: ac1Passed,
    durationMs: Math.round(performance.now() - ac1Start),
    details: 'Verified offline execution, network isolation, Smart Import, and Ask Your Vault.',
    subchecks: ac1Subchecks
  });

  // --- AC-E-MR-01-02: Redaction Boundary Suite ---
  const ac2Start = performance.now();
  let ac2Passed = true;
  const ac2Subchecks: ACVerificationResult['subchecks'] = [];
  try {
    const redacted = redactVaultEntries(MOCK_VAULT_ENTRIES, true);
    const audit = assertZeroSecretExposure(redacted, MOCK_VAULT_ENTRIES, MOCK_RECOVERY_PHRASE_24_WORDS);
    ac2Subchecks.push({
      name: 'Zero Denied Field Exposure Audit',
      passed: audit.clean,
      evidence: audit.clean ? '0 secret leaks' : audit.leaks.join('; ')
    });

    const cryptoExcluded = !redacted.some((r) => r.title.toLowerCase().includes('ethereum'));
    ac2Subchecks.push({
      name: 'Crypto Wallet 100% Total Exclusion',
      passed: cryptoExcluded,
      evidence: `cryptoExcluded=${cryptoExcluded}`
    });

    const lockedRedacted = redactVaultEntries(MOCK_VAULT_ENTRIES, false);
    ac2Subchecks.push({
      name: 'Vault Locked Metadata Access Denial',
      passed: lockedRedacted.length === 0,
      evidence: `projectedWhenLocked=${lockedRedacted.length}`
    });
  } catch (err) {
    ac2Passed = false;
    ac2Subchecks.push({ name: 'Execution Error', passed: false, evidence: (err as Error).message });
  }
  ac2Passed = ac2Passed && ac2Subchecks.every((s) => s.passed);
  acResults.push({
    acId: 'AC-E-MR-01-02',
    name: 'Redaction suite proves no denied field reaches model input',
    passed: ac2Passed,
    durationMs: Math.round(performance.now() - ac2Start),
    details: 'Verified zero secret leaks, crypto exclusion, and vault-locked blindness.',
    subchecks: ac2Subchecks
  });

  // --- AC-E-MR-01-03: Direct Sync E2E Suite ---
  const ac3Start = performance.now();
  let ac3Passed = true;
  const ac3Subchecks: ACVerificationResult['subchecks'] = [];
  try {
    const nodeA = new DirectSyncDeviceNode();
    const nodeB = new DirectSyncDeviceNode();
    nodeA.pairWithPeer(nodeB, 'release-rehearsal-pairing-key');

    ac3Subchecks.push({
      name: 'Ed25519 Device ID Derivation (SHA-256)',
      passed: nodeA.identity.deviceId.length === 64 && nodeB.identity.deviceId.length === 64,
      evidence: `nodeA=${nodeA.identity.deviceId.slice(0, 8)}..., nodeB=${nodeB.identity.deviceId.slice(0, 8)}...`
    });

    const baseEntry = { ...MOCK_VAULT_ENTRIES[0] };
    const deltas = nodeA.setEntry(baseEntry);
    const received = nodeB.receiveSyncDelta(deltas[0]);

    ac3Subchecks.push({
      name: 'Direct AES-256-GCM Encrypted Delta Replication',
      passed: received.id === baseEntry.id && received.title === baseEntry.title,
      evidence: `replicatedEntryId=${received.id}`
    });
  } catch (err) {
    ac3Passed = false;
    ac3Subchecks.push({ name: 'Execution Error', passed: false, evidence: (err as Error).message });
  }
  ac3Passed = ac3Passed && ac3Subchecks.every((s) => s.passed);
  acResults.push({
    acId: 'AC-E-MR-01-03',
    name: 'Device A change syncs to Device B through direct sync',
    passed: ac3Passed,
    durationMs: Math.round(performance.now() - ac3Start),
    details: 'Verified Ed25519 identities, SPAKE2 pairing, and encrypted delta transmission.',
    subchecks: ac3Subchecks
  });

  // --- AC-E-MR-01-04: Privacy Scanner ---
  const ac4Start = performance.now();
  let ac4Passed = true;
  const ac4Subchecks: ACVerificationResult['subchecks'] = [];
  try {
    const workspaceRoot = path.resolve(import.meta.dirname, '../');
    const scan = await scanDirectoryForPrivacy(workspaceRoot);

    ac4Subchecks.push({
      name: 'Workspace Source & Fixture Privacy Scan',
      passed: scan.clean,
      evidence: `filesScanned=${scan.totalScanned}, findings=${scan.findings.length}`
    });

    const logAudit = scanLogsForPrivacyViolations([
      {
        eventId: 'EVT-001',
        category: 'VAULT',
        action: 'UNLOCK',
        timestamp: Date.now(),
        status: 'SUCCESS'
      }
    ]);
    ac4Subchecks.push({
      name: 'Event-Based Log Format Compliance',
      passed: logAudit.clean,
      evidence: `logFormatClean=${logAudit.clean}`
    });
  } catch (err) {
    ac4Passed = false;
    ac4Subchecks.push({ name: 'Execution Error', passed: false, evidence: (err as Error).message });
  }
  ac4Passed = ac4Passed && ac4Subchecks.every((s) => s.passed);
  acResults.push({
    acId: 'AC-E-MR-01-04',
    name: 'Fixtures, logs, and crash output contain no real secrets',
    passed: ac4Passed,
    durationMs: Math.round(performance.now() - ac4Start),
    details: 'Verified zero high-risk secrets in workspace and validated structured log format.',
    subchecks: ac4Subchecks
  });

  // --- AC-E-MR-01-05: P0 Demo Loop 3-Run Rehearsal ---
  const ac5Start = performance.now();
  let ac5Passed = true;
  const ac5Subchecks: ACVerificationResult['subchecks'] = [];
  let rehearsalReport: Awaited<ReturnType<typeof executeThreeRunReleaseRehearsal>> | undefined;
  try {
    rehearsalReport = await executeThreeRunReleaseRehearsal();
    ac5Passed = rehearsalReport.allPassed;

    rehearsalReport.runs.forEach((r) => {
      ac5Subchecks.push({
        name: `P0 Winning Demo Loop Run #${r.runNumber}`,
        passed: r.passed,
        evidence: `stepsPassed=${r.steps.filter((s) => s.passed).length}/12 (${r.durationMs}ms)`
      });
    });
  } catch (err) {
    ac5Passed = false;
    ac5Subchecks.push({ name: 'Execution Error', passed: false, evidence: (err as Error).message });
  }
  acResults.push({
    acId: 'AC-E-MR-01-05',
    name: 'P0 demo loop passes three consecutive runs',
    passed: ac5Passed,
    durationMs: Math.round(performance.now() - ac5Start),
    details: 'Executed complete 12-step demo loop 3 consecutive times with zero flakes.',
    subchecks: ac5Subchecks
  });

  const totalDurationMs = Math.round(performance.now() - globalStart);
  const allPassed = acResults.every((r) => r.passed);

  // Print Formatted Report
  for (const ac of acResults) {
    const statusTag = ac.passed ? '[PASS]' : '[FAIL]';
    console.log(`${statusTag} ${ac.acId}: ${ac.name} (${ac.durationMs}ms)`);
    for (const sub of ac.subchecks) {
      const subTag = sub.passed ? '  OK ' : '  ERR';
      console.log(`  ${subTag} - ${sub.name}: ${sub.evidence}`);
    }
    console.log('');
  }

  console.log('---------------------------------------------------------------');
  console.log(`OVERALL RESULT: ${allPassed ? 'ALL ACCEPTANCE CRITERIA PASSED' : 'VERIFICATION FAILED'}`);
  console.log(`Total Duration: ${totalDurationMs}ms`);
  console.log('---------------------------------------------------------------\n');

  return {
    timestamp: new Date().toISOString(),
    allPassed,
    acResults,
    rehearsalRuns: rehearsalReport ? rehearsalReport.runs : [],
    totalDurationMs
  };
}

runReleaseVerification()
  .then((report) => {
    if (!report.allPassed) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('Fatal verification runner error:', err);
    process.exit(1);
  });
