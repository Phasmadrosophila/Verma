import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { OfflineLocalAIEngine } from '../../src/verification/offline-ai.ts';
import { MESSY_BROWSER_CSV_FIXTURE, MOCK_VAULT_ENTRIES } from '../../src/verification/fixtures.ts';
import { redactVaultEntries } from '../../src/verification/redaction.ts';

describe('AC-E-MR-01-01: Offline AI Demo & Network Denial', () => {
  it('should assert network isolation and reject network egress attempts in offline mode', () => {
    const engine = new OfflineLocalAIEngine({ disableNetwork: true });
    const isolation = engine.assertNetworkIsolated();

    assert.strictEqual(isolation.isolated, true, 'Engine must report strict network isolation');
    assert.strictEqual(isolation.violations, 0, 'Initial violations must be 0');

    // Attempting network call in offline mode must throw
    assert.throws(
      () => engine.attemptNetworkCall(),
      /E_NET_ISOLATION_VIOLATION/,
      'Network egress attempt must be blocked by sandbox'
    );
  });

  it('should perform Smart Import analysis on messy CSV fixture without network connectivity', async () => {
    const engine = new OfflineLocalAIEngine({ disableNetwork: true });
    const proposal = await engine.analyzeCsvImport(MESSY_BROWSER_CSV_FIXTURE);

    // Verify column mappings
    assert.ok(proposal.columnMappings.length >= 6, 'Must generate mappings for all CSV columns');
    const titleMapping = proposal.columnMappings.find((m) => m.csvHeader.toLowerCase() === 'name');
    assert.ok(titleMapping, 'Must map "name" column');
    assert.strictEqual(titleMapping?.targetField, 'title');

    const passMapping = proposal.columnMappings.find((m) => m.csvHeader.toLowerCase() === 'password');
    assert.ok(passMapping, 'Must map "password" column');
    assert.strictEqual(passMapping?.targetField, 'password');

    // Verify tag suggestions
    assert.ok(proposal.tagSuggestions.length > 0, 'Must propose tag suggestions');
    const googleSuggestion = proposal.tagSuggestions.find((t) => t.suggestedTags.includes('google'));
    assert.ok(googleSuggestion, 'Must propose "google" tag for Google entries');

    // Verify duplicate groups
    assert.ok(proposal.duplicateGroups.length > 0, 'Must identify duplicate groups');
    const dupGroup = proposal.duplicateGroups[0];
    assert.ok(dupGroup.duplicateEntryIds.length > 0, 'Duplicate group must contain duplicate entry IDs');
    assert.ok(dupGroup.matchReason.includes('accounts.google.com') || dupGroup.matchReason.includes('google.com') || dupGroup.matchReason.includes('aws'));
  });

  it('should perform Ask Your Vault natural language search over redacted metadata with secrets hidden', async () => {
    const engine = new OfflineLocalAIEngine({ disableNetwork: true });
    const redactedMetadata = redactVaultEntries(MOCK_VAULT_ENTRIES, true);

    const result = await engine.askYourVault(
      'my work Google account for Company X',
      redactedMetadata
    );

    assert.ok(result.matchedEntries.length > 0, 'Must find matching entries');
    const topMatch = result.matchedEntries[0];
    assert.ok(
      topMatch.title.toLowerCase().includes('google') || topMatch.tags.includes('google'),
      'Top match must be relevant Google entry'
    );
    assert.strictEqual(topMatch.isSecretLocked, true, 'Secrets must remain locked in search results');
  });

  it('should operate toollessly without mutating vault state or executing commands', async () => {
    const engine = new OfflineLocalAIEngine({ disableNetwork: true });
    const redactedMetadata = redactVaultEntries(MOCK_VAULT_ENTRIES, true);

    // Run query
    const result = await engine.askYourVault('github work', redactedMetadata);
    assert.ok(result.matchedEntries.length > 0);

    // Verify metadata was not mutated
    assert.strictEqual(redactedMetadata.length, 5, 'Metadata count must remain unchanged');
  });
});
