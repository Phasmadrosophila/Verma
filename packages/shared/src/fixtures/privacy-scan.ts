import {
  ALL_SYNTHETIC_ENTRIES,
  SYNTHETIC_PASSWORD_FOR_VAULT,
  SYNTHETIC_RECOVERY_PHRASE,
  SYNTHETIC_MESSY_BROWSER_CSV,
  SYNTHETIC_CLEAN_BROWSER_CSV,
} from './synthetic-data.js';

export const LIVE_CREDENTIAL_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,                     // Real AWS Access Key ID
  /sk_live_[0-9a-zA-Z]{24,}/,             // Real Stripe Live Key
  /ghp_[0-9a-zA-Z]{36}/,                  // GitHub Personal Access Token
  /gho_[0-9a-zA-Z]{36}/,                  // GitHub OAuth Token
  /xox[baprs]-[0-9a-zA-Z]{10,48}/,        // Slack API Tokens
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, // Real PEM Private Keys
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/, // JWTs
];

export interface PrivacyScanReport {
  passed: boolean;
  totalEntriesScanned: number;
  syntheticMarkerCount: number;
  liveCredentialMatches: string[];
  findings: string[];
}

export function scanFixturesForPrivacy(): PrivacyScanReport {
  const liveCredentialMatches: string[] = [];
  const findings: string[] = [];
  let syntheticMarkerCount = 0;

  const allStringsToScan: string[] = [
    SYNTHETIC_PASSWORD_FOR_VAULT,
    SYNTHETIC_RECOVERY_PHRASE,
    SYNTHETIC_MESSY_BROWSER_CSV,
    SYNTHETIC_CLEAN_BROWSER_CSV,
  ];

  for (const entry of ALL_SYNTHETIC_ENTRIES) {
    allStringsToScan.push(JSON.stringify(entry));
  }

  for (const text of allStringsToScan) {
    // Check for live patterns
    for (const pattern of LIVE_CREDENTIAL_PATTERNS) {
      if (pattern.test(text)) {
        liveCredentialMatches.push(`Matched live pattern ${pattern.toString()}`);
      }
    }

    // Count synthetic markers
    const matches = text.match(/synth|example\.test|syn-/gi);
    if (matches) {
      syntheticMarkerCount += matches.length;
    }
  }

  if (liveCredentialMatches.length > 0) {
    findings.push(...liveCredentialMatches);
  }

  if (syntheticMarkerCount === 0) {
    findings.push('No synthetic markers identified in fixtures');
  }

  return {
    passed: liveCredentialMatches.length === 0 && syntheticMarkerCount > 0,
    totalEntriesScanned: ALL_SYNTHETIC_ENTRIES.length,
    syntheticMarkerCount,
    liveCredentialMatches,
    findings,
  };
}
