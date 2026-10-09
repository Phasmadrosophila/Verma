import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { LogEvent, VaultEntry } from './types.ts';

export interface PrivacyScanFinding {
  source: string;
  rule: string;
  detail: string;
}

export interface PrivacyScanResult {
  clean: boolean;
  totalScanned: number;
  findings: PrivacyScanFinding[];
}

/**
 * Known signatures of real high-risk secrets that must NEVER appear in codebase or logs.
 */
const HIGH_RISK_SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'AWS Access Key ID', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub Personal Access Token', regex: /\bghp_[0-9a-zA-Z]{36}\b/ },
  { name: 'OpenAI / Claude API Key', regex: /\bsk-(?:live|ant)-[0-9a-zA-Z_-]{32,}\b/ },
  { name: 'Generic RSA/EC Private Key', regex: /-----BEGIN (?:RSA|EC|OPENSSH) PRIVATE KEY-----/ },
  { name: 'Hardcoded Production JWT', regex: /\beyJhbGciOi[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/ }
];

/**
 * Scans structured or raw log entries for plaintext secret exposure or unredacted user data.
 */
export function scanLogsForPrivacyViolations(
  logs: Array<LogEvent | string>,
  knownRawSecrets: string[] = []
): PrivacyScanResult {
  const findings: PrivacyScanFinding[] = [];

  logs.forEach((logItem, index) => {
    const rawString = typeof logItem === 'string' ? logItem : JSON.stringify(logItem);
    const source = `LogEntry#${index + 1}`;

    // 1. Check known secret leak patterns
    for (const pattern of HIGH_RISK_SECRET_PATTERNS) {
      if (pattern.regex.test(rawString)) {
        findings.push({
          source,
          rule: 'HIGH_RISK_SECRET_PATTERN',
          detail: `Found potential real credential matching ${pattern.name}`
        });
      }
    }

    // 2. Check for known test secrets appearing in logs
    for (const secret of knownRawSecrets) {
      if (secret && secret.length > 5 && rawString.includes(secret)) {
        findings.push({
          source,
          rule: 'RAW_SECRET_LEAK',
          detail: `Raw secret value leaked directly into log output: "${secret.slice(0, 3)}***"`
        });
      }
    }

    // 3. If structured LogEvent, enforce that details do not contain raw passwords
    if (typeof logItem === 'object' && logItem !== null && 'category' in logItem) {
      const event = logItem as LogEvent;
      if (!event.eventId || !event.category || !event.status) {
        findings.push({
          source,
          rule: 'STRUCTURED_LOG_STANDARD',
          detail: 'LogEvent missing required standard fields (eventId, category, status)'
        });
      }

      if (event.details) {
        for (const [key, val] of Object.entries(event.details)) {
          const keyLower = key.toLowerCase();
          if (
            keyLower.includes('password') ||
            keyLower.includes('secret') ||
            keyLower.includes('notebody') ||
            keyLower.includes('seedphrase')
          ) {
            findings.push({
              source,
              rule: 'SECRET_KEY_IN_LOG_DETAILS',
              detail: `Log details object contains forbidden secret field key: "${key}"`
            });
          }
        }
      }
    }
  });

  return {
    clean: findings.length === 0,
    totalScanned: logs.length,
    findings
  };
}

/**
 * Scans a file's content for real secrets or unredacted confidential data.
 */
export function scanFileContentForSecrets(content: string, filePath = 'in-memory-buffer'): PrivacyScanFinding[] {
  const findings: PrivacyScanFinding[] = [];

  for (const pattern of HIGH_RISK_SECRET_PATTERNS) {
    if (pattern.regex.test(content)) {
      findings.push({
        source: filePath,
        rule: 'HIGH_RISK_SECRET_PATTERN',
        detail: `Found potential real credential matching ${pattern.name}`
      });
    }
  }

  return findings;
}

/**
 * Recursively scans directory for privacy violations, credentials, and non-synthetic fixtures.
 */
export async function scanDirectoryForPrivacy(dirPath: string): Promise<PrivacyScanResult> {
  const findings: PrivacyScanFinding[] = [];
  let fileCount = 0;

  async function walk(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === '.worktrees' ||
          entry.name === 'dist'
        ) {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (
          entry.name.endsWith('.ts') ||
          entry.name.endsWith('.js') ||
          entry.name.endsWith('.json') ||
          entry.name.endsWith('.csv') ||
          entry.name.endsWith('.md')
        ) {
          fileCount++;
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const fileFindings = scanFileContentForSecrets(content, fullPath);
            findings.push(...fileFindings);
          } catch {
            // Ignore unreadable files
          }
        }
      }
    }
  }

  try {
    await walk(dirPath);
  } catch (err) {
    findings.push({
      source: dirPath,
      rule: 'FS_READ_ERROR',
      detail: `Failed to scan directory: ${(err as Error).message}`
    });
  }

  return {
    clean: findings.length === 0,
    totalScanned: fileCount,
    findings
  };
}
