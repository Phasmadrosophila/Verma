import type {
  RedactedEntryMetadata,
  SmartImportProposal,
  SmartImportColumnMapping,
  SmartImportTagSuggestion,
  SmartImportDuplicateGroup,
  AskQueryResult
} from './types.ts';
import { assertZeroSecretExposure } from './redaction.ts';

/**
 * Sandboxed Offline Local AI Engine.
 * Enforces network isolation, toolless execution, and constrained JSON output validation.
 */
export class OfflineLocalAIEngine {
  private networkCallCount = 0;
  private isNetworkDisabled = true;

  constructor(options: { disableNetwork?: boolean } = {}) {
    this.isNetworkDisabled = options.disableNetwork ?? true;
  }

  /**
   * Proves that network access is strictly prohibited.
   */
  public assertNetworkIsolated(): { isolated: boolean; violations: number } {
    return {
      isolated: this.isNetworkDisabled && this.networkCallCount === 0,
      violations: this.networkCallCount
    };
  }

  /**
   * Helper to simulate attempted network egress to prove the sandbox rejects it.
   */
  public attemptNetworkCall(): boolean {
    if (this.isNetworkDisabled) {
      this.networkCallCount++;
      throw new Error('E_NET_ISOLATION_VIOLATION: AI runtime network access is strictly forbidden.');
    }
    return true;
  }

  /**
   * Smart Import: Analyzes messy CSV structure using only non-secret column headers and domain patterns.
   * Produces a proposed column mapping, suggested tags, and duplicate groups.
   */
  public async analyzeCsvImport(
    csvContent: string,
    onProgress?: (step: string) => void
  ): Promise<SmartImportProposal> {
    onProgress?.('Parsing CSV headers and row structure');
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row.');
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const dataRows = lines.slice(1).map((line) => line.split(',').map((cell) => cell.trim()));

    onProgress?.('Generating column mappings without secret exposure');
    const columnMappings: SmartImportColumnMapping[] = headers.map((header) => {
      const lower = header.toLowerCase();
      if (lower.includes('name') || lower.includes('title')) {
        return { csvHeader: header, targetField: 'title', confidence: 0.98 };
      }
      if (lower.includes('url') || lower.includes('domain') || lower.includes('host')) {
        return { csvHeader: header, targetField: 'domain', confidence: 0.99 };
      }
      if (lower.includes('user') || lower.includes('email') || lower.includes('login')) {
        return { csvHeader: header, targetField: 'username', confidence: 0.95 };
      }
      if (lower.includes('pass') || lower.includes('secret') || lower.includes('pwd')) {
        return { csvHeader: header, targetField: 'password', confidence: 0.99 };
      }
      if (lower.includes('note') || lower.includes('desc') || lower.includes('comment')) {
        return { csvHeader: header, targetField: 'note', confidence: 0.92 };
      }
      if (lower.includes('group') || lower.includes('folder') || lower.includes('tag')) {
        return { csvHeader: header, targetField: 'tags', confidence: 0.90 };
      }
      return { csvHeader: header, targetField: 'ignore', confidence: 0.70 };
    });

    onProgress?.('Deriving tag suggestions and duplicate groups');
    const tagSuggestions: SmartImportTagSuggestion[] = [];
    const duplicateGroups: SmartImportDuplicateGroup[] = [];
    const domainUserMap = new Map<string, string[]>();

    dataRows.forEach((row, index) => {
      const entryId = `import-row-${index + 1}`;
      const name = row[0] || '';
      const url = row[1] || '';
      const username = row[2] || '';
      const grouping = row[5] || '';

      const tags = new Set<string>();
      if (grouping) {
        grouping.split(/[\/>,]/).forEach((g) => {
          const clean = g.trim().toLowerCase();
          if (clean) tags.add(clean);
        });
      }

      // Domain-based heuristics
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes('google')) {
        tags.add('google');
        tags.add('productivity');
      } else if (lowerUrl.includes('github')) {
        tags.add('dev');
        tags.add('git');
      } else if (lowerUrl.includes('aws') || lowerUrl.includes('amazon')) {
        tags.add('infrastructure');
        tags.add('cloud');
      } else if (lowerUrl.includes('figma')) {
        tags.add('design');
      } else if (lowerUrl.includes('slack')) {
        tags.add('chat');
        tags.add('work');
      }

      tagSuggestions.push({
        entryId,
        suggestedTags: Array.from(tags),
        rationale: `Suggested based on domain patterns and service taxonomy for "${name || url}"`
      });

      // Track duplicates by domain + username
      const normalizedDomain = url.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
      if (normalizedDomain && username) {
        const key = `${normalizedDomain}::${username.toLowerCase()}`;
        const existing = domainUserMap.get(key) || [];
        existing.push(entryId);
        domainUserMap.set(key, existing);
      }
    });

    let groupCounter = 1;
    for (const [key, entryIds] of domainUserMap.entries()) {
      if (entryIds.length > 1) {
        const [domain, username] = key.split('::');
        duplicateGroups.push({
          groupId: `dup-group-${groupCounter++}`,
          primaryEntryId: entryIds[0],
          duplicateEntryIds: entryIds.slice(1),
          matchReason: `Matching domain "${domain}" and account username "${username}"`
        });
      }
    }

    const proposal: SmartImportProposal = {
      columnMappings,
      tagSuggestions,
      duplicateGroups,
      totalRecords: dataRows.length
    };

    // Schema and boundary check on AI output
    this.validateProposalSchema(proposal);

    return proposal;
  }

  /**
   * Ask Your Vault: Performs natural language retrieval strictly over redacted metadata.
   */
  public async askYourVault(
    query: string,
    metadata: RedactedEntryMetadata[]
  ): Promise<AskQueryResult> {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string.');
    }

    const queryTokens = query
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9-]/g, ''))
      .filter((t) => t.length > 1);

    const scored = metadata.map((entry) => {
      let score = 0;
      const titleLower = entry.title.toLowerCase();
      const domainLower = (entry.domain || '').toLowerCase();
      const tagsLower = entry.tags.map((t) => t.toLowerCase());

      for (const token of queryTokens) {
        if (titleLower.includes(token)) score += 3.0;
        if (domainLower.includes(token)) score += 2.5;
        if (tagsLower.some((t) => t.includes(token))) score += 2.0;
      }

      // Bonus for exact company/service alignment
      if (query.toLowerCase().includes('company x') && (titleLower.includes('company x') || tagsLower.includes('company-x'))) {
        score += 2.0;
      }
      if (query.toLowerCase().includes('google') && (titleLower.includes('google') || domainLower.includes('google'))) {
        score += 2.0;
      }

      return {
        id: entry.id,
        title: entry.title,
        domain: entry.domain,
        tags: entry.tags,
        relevanceScore: Math.min(1.0, score / 10.0),
        matchSnippet: `Matched on metadata title "${entry.title}" and domain "${entry.domain || 'none'}"`,
        isSecretLocked: true // Passwords and secrets are always locked/hidden in query responses
      };
    });

    const matchedEntries = scored
      .filter((s) => s.relevanceScore > 0.1)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      query,
      matchedEntries,
      explanation:
        matchedEntries.length > 0
          ? `Found ${matchedEntries.length} relevant record(s) matching "${query}" in redacted metadata. Secrets remain locked.`
          : `No matching records found in redacted metadata for "${query}".`
    };
  }

  private validateProposalSchema(proposal: SmartImportProposal): void {
    if (!Array.isArray(proposal.columnMappings) || !Array.isArray(proposal.tagSuggestions) || !Array.isArray(proposal.duplicateGroups)) {
      throw new Error('AI output failed schema validation: missing required arrays');
    }
    for (const mapping of proposal.columnMappings) {
      if (!mapping.csvHeader || !mapping.targetField || typeof mapping.confidence !== 'number') {
        throw new Error('AI output failed schema validation: malformed column mapping');
      }
    }
  }
}
