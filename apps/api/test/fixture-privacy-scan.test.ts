import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { VaultRepository } from '../src/repository/vault-repository.js';
import {
  scanFixturesForPrivacy,
  ALL_SYNTHETIC_ENTRIES,
  SafeLogger,
} from '@app/shared';

describe('AC-A-M0-01-04: Fixture Privacy Scan & Safe Log-Output Test', () => {
  let repo: VaultRepository;
  let customLogger: SafeLogger;
  const masterPassword = 'FixtureTestMasterPassword2026!';

  beforeEach(async () => {
    customLogger = new SafeLogger();
    repo = new VaultRepository(undefined, customLogger);
    await repo.initialize(masterPassword);
  });

  it('should pass automated synthetic fixture privacy scan', () => {
    const report = scanFixturesForPrivacy();

    assert.equal(report.passed, true, `Privacy scan failed with findings: ${report.findings.join(', ')}`);
    assert.equal(report.liveCredentialMatches.length, 0, 'Fixtures must contain ZERO live credentials');
    assert.ok(report.syntheticMarkerCount > 0, 'Fixtures must contain synthetic markers');
    assert.equal(report.totalEntriesScanned, ALL_SYNTHETIC_ENTRIES.length);
  });

  it('should seed synthetic fixtures into vault repository', async () => {
    const seededCount = await repo.seedSyntheticFixtures();
    assert.equal(seededCount, ALL_SYNTHETIC_ENTRIES.length);

    const list = await repo.listEntries();
    assert.equal(list.length, ALL_SYNTHETIC_ENTRIES.length);

    // Verify all 3 P0 entry types exist in seeded data
    const logins = list.filter((e) => e.type === 'login');
    const notes = list.filter((e) => e.type === 'note');
    const apiKeys = list.filter((e) => e.type === 'api_key');

    assert.ok(logins.length >= 3, 'Seeded fixtures must contain login entries');
    assert.ok(notes.length >= 3, 'Seeded fixtures must contain note entries');
    assert.ok(apiKeys.length >= 3, 'Seeded fixtures must contain api_key entries');
  });

  it('should maintain strict zero secret exposure in logger across entire repository lifecycle', async () => {
    // Perform full suite of operations with customLogger recording all events
    await repo.seedSyntheticFixtures();

    const created = await repo.createEntry({
      type: 'login',
      title: 'Secret Service Portal',
      username: 'agent.secret@internal.test',
      password: 'MyTopSecretLivePasswordXYZ!',
      tags: ['secret'],
    } as any);

    await repo.updateEntry(created.id, {
      password: 'MyUpdatedSecretLivePasswordABC!',
    } as any);

    await repo.getMetadataList();
    await repo.searchMetadata('Secret');
    await repo.deleteEntry(created.id);
    repo.lock();

    // Inspect all recorded log events
    const loggedEvents = customLogger.getLoggedEvents();
    assert.ok(loggedEvents.length > 0);

    const serializedLogs = JSON.stringify(loggedEvents);

    // Invariant: Zero secrets ever appear in logged events
    assert.ok(
      !serializedLogs.includes('MyTopSecretLivePasswordXYZ!'),
      'Initial password must not appear in logs'
    );
    assert.ok(
      !serializedLogs.includes('MyUpdatedSecretLivePasswordABC!'),
      'Updated password must not appear in logs'
    );
    assert.ok(
      !serializedLogs.includes(masterPassword),
      'Master vault password must not appear in logs'
    );

    // Verify that every logged event has valid event identifier and timestamp
    for (const evt of loggedEvents) {
      assert.ok(evt.event, 'Logged event must have an event identifier');
      assert.ok(evt.timestamp > 0, 'Logged event must have a timestamp');
    }
  });
});
