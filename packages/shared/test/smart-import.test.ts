import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCsv,
  suggestColumnMappings,
  findDuplicateGroups,
  generateImportProposal,
  SYNTHETIC_MESSY_BROWSER_CSV,
  SYNTHETIC_CLEAN_BROWSER_CSV,
  scanFixturesForPrivacy,
} from '../src/index.js';

describe('Smart Import Engine (B-M1-03)', () => {
  describe('RFC 4180 CSV Parser', () => {
    test('should parse standard CSV with headers and values', () => {
      const csv = 'Title,Username,Password\nGitHub,dev@example.test,Secret123';
      const result = parseCsv(csv);
      assert.deepEqual(result.headers, ['Title', 'Username', 'Password']);
      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].Title, 'GitHub');
      assert.equal(result.rows[0].Username, 'dev@example.test');
      assert.equal(result.rows[0].Password, 'Secret123');
    });

    test('should handle quotes, commas inside fields, and escaped quotes', () => {
      const csv = `"Name, with comma","Login","Password"\n"Site ""Alpha""",user1,pass1`;
      const result = parseCsv(csv);
      assert.deepEqual(result.headers, ['Name, with comma', 'Login', 'Password']);
      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0]['Name, with comma'], 'Site "Alpha"');
    });

    test('should handle Windows CRLF line endings and trailing whitespace', () => {
      const csv = "Title,URL,Password\r\nGoogle,https://google.com,pass123\r\n";
      const result = parseCsv(csv);
      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].Title, 'Google');
    });
  });

  describe('Heuristic Column Mapping', () => {
    test('should correctly map standard messy browser export headers', () => {
      const headers = ['name', 'url', 'username', 'password', 'note', 'folder'];
      const mappings = suggestColumnMappings(headers);

      const mapObj = Object.fromEntries(mappings.map((m) => [m.sourceColumn, m.targetField]));
      assert.equal(mapObj.name, 'title');
      assert.equal(mapObj.url, 'url');
      assert.equal(mapObj.username, 'username');
      assert.equal(mapObj.password, 'password');
      assert.equal(mapObj.note, 'notes');
      assert.equal(mapObj.folder, 'tags');

      for (const m of mappings) {
        assert.equal(m.confidence, 'high');
        assert.equal(m.suggestedBy, 'heuristic');
      }
    });

    test('should assign low confidence ignore to unrecognized headers', () => {
      const mappings = suggestColumnMappings(['guid', 'unknown_field']);
      for (const m of mappings) {
        assert.equal(m.targetField, 'ignore');
        assert.equal(m.confidence, 'low');
      }
    });
  });

  describe('Duplicate Detection & Groups', () => {
    test('should identify duplicate candidates sharing domain and username in CSV', () => {
      const candidates = [
        { rowIndex: 0, title: 'GitHub Work', username: 'synth.dev@example.test', url: 'https://github.com/login', domain: 'github.com' },
        { rowIndex: 1, title: 'Google Mail', username: 'synth.dev@example.test', url: 'https://mail.google.com', domain: 'google.com' },
        { rowIndex: 2, title: 'GitHub Duplicate', username: 'synth.dev@example.test', url: 'https://github.com/login', domain: 'github.com' },
      ];

      const groups = findDuplicateGroups(candidates);
      assert.equal(groups.length, 1);
      assert.equal(groups[0].candidates.length, 2);
      assert.equal(groups[0].candidates[0].rowIndex, 0);
      assert.equal(groups[0].candidates[1].rowIndex, 2);
    });

    test('should identify duplicates against existing unlocked vault metadata', () => {
      const candidates = [
        { rowIndex: 0, title: 'GitHub Work', username: 'synth.dev@example.test', url: 'https://github.com', domain: 'github.com' },
      ];

      const existingMetadata = [
        {
          id: 'existing-entry-1',
          type: 'login',
          title: 'GitHub Personal',
          domain: 'github.com',
          tags: ['dev'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          fieldLabels: ['username'],
        },
      ];

      const groups = findDuplicateGroups(candidates, existingMetadata);
      assert.equal(groups.length, 1);
      assert.equal(groups[0].candidates[0].matchedExistingId, 'existing-entry-1');
    });
  });

  describe('Import Proposal Generation & Privacy Boundary', () => {
    test('should generate structured proposal from synthetic messy browser CSV', () => {
      const proposal = generateImportProposal(SYNTHETIC_MESSY_BROWSER_CSV);
      assert.equal(proposal.sourceType, 'browser_csv');
      assert.equal(proposal.totalRows, 6);
      assert.equal(proposal.previewRows.length, 6);

      // Verify column mappings
      const titleMapping = proposal.mappings.find((m) => m.targetField === 'title');
      assert.ok(titleMapping);
      assert.equal(titleMapping.sourceColumn, 'name');

      // Verify duplicate group detected for GitHub entries (rows 0 and 4)
      assert.ok(proposal.duplicateGroups.length >= 1);
      const gitHubGroup = proposal.duplicateGroups.find((g) => g.key.includes('github.com'));
      assert.ok(gitHubGroup);
      assert.equal(gitHubGroup.candidates.length, 2);

      // Verify tags suggested
      assert.ok(proposal.suggestedTags.includes('Development'));
    });

    test('should strictly mask passwords in preview rows and never leak plaintext secrets in metadata', () => {
      const proposal = generateImportProposal(SYNTHETIC_MESSY_BROWSER_CSV);

      for (const row of proposal.previewRows) {
        if (row.hasPasswordSecret) {
          assert.equal(row.proposedEntry.passwordMasked, '••••••••');
        }
        // Ensure no plaintext password leaks into title, domain, or notes
        assert.ok(!row.proposedEntry.title.includes('Syn-Pass'));
        assert.ok(!row.proposedEntry.username.includes('Syn-Pass'));
        if (row.proposedEntry.notes) {
          assert.ok(!row.proposedEntry.notes.includes('Syn-Pass'));
        }
      }
    });

    test('synthetic CSV fixtures must pass automated privacy scan with zero live credentials', () => {
      const report = scanFixturesForPrivacy();
      assert.equal(report.passed, true);
      assert.equal(report.liveCredentialMatches.length, 0);
      assert.ok(report.syntheticMarkerCount > 0);
    });
  });
});
