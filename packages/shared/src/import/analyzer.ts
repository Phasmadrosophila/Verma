import type { RedactedEntryMetadata } from '../types/metadata.js';
import type {
  TargetField,
  ColumnMapping,
  DuplicateCandidate,
  DuplicateGroup,
  ImportPreviewRow,
  ImportProposal,
} from '../types/import.js';
import { parseCsv } from './csv-parser.js';

export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[\s_\-]+/g, '');
}

export function extractDomainFromUrl(url?: string): string | undefined {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return undefined;
  }
  try {
    let toParse = url.trim();
    if (!toParse.startsWith('http://') && !toParse.startsWith('https://')) {
      toParse = `https://${toParse}`;
    }
    const parsed = new URL(toParse);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return undefined;
  }
}

/**
 * Deterministic heuristic column mapper for common password manager exports.
 */
export function suggestColumnMappings(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const assignedTargets = new Set<TargetField>();

  for (const header of headers) {
    const norm = normalizeHeader(header);

    // Exact and high confidence patterns
    if (['password', 'pass', 'pwd', 'secret'].includes(norm)) {
      mappings.push({ sourceColumn: header, targetField: 'password', confidence: 'high', suggestedBy: 'heuristic' });
      assignedTargets.add('password');
    } else if (['username', 'login', 'user', 'email', 'loginname', 'accountname', 'userid'].includes(norm)) {
      mappings.push({ sourceColumn: header, targetField: 'username', confidence: 'high', suggestedBy: 'heuristic' });
      assignedTargets.add('username');
    } else if (['url', 'website', 'loginurl', 'link', 'address', 'uri', 'origin', 'webpage'].includes(norm)) {
      mappings.push({ sourceColumn: header, targetField: 'url', confidence: 'high', suggestedBy: 'heuristic' });
      assignedTargets.add('url');
    } else if (['title', 'name', 'sitename', 'site', 'account', 'label', 'servicename', 'itemname'].includes(norm)) {
      mappings.push({ sourceColumn: header, targetField: 'title', confidence: 'high', suggestedBy: 'heuristic' });
      assignedTargets.add('title');
    } else if (['notes', 'note', 'comments', 'comment', 'extra', 'description', 'memo'].includes(norm)) {
      mappings.push({ sourceColumn: header, targetField: 'notes', confidence: 'high', suggestedBy: 'heuristic' });
      assignedTargets.add('notes');
    } else if (['folder', 'tag', 'tags', 'group', 'category', 'grouping', 'folders'].includes(norm)) {
      mappings.push({ sourceColumn: header, targetField: 'tags', confidence: 'high', suggestedBy: 'heuristic' });
      assignedTargets.add('tags');
    } else if (['service', 'system', 'app'].includes(norm) && !assignedTargets.has('title')) {
      mappings.push({ sourceColumn: header, targetField: 'title', confidence: 'medium', suggestedBy: 'heuristic' });
      assignedTargets.add('title');
    } else if (['info', 'details'].includes(norm) && !assignedTargets.has('notes')) {
      mappings.push({ sourceColumn: header, targetField: 'notes', confidence: 'medium', suggestedBy: 'heuristic' });
      assignedTargets.add('notes');
    } else {
      mappings.push({ sourceColumn: header, targetField: 'ignore', confidence: 'low', suggestedBy: 'heuristic' });
    }
  }

  return mappings;
}

export function findDuplicateGroups(
  entries: {
    rowIndex: number;
    title: string;
    username: string;
    url?: string;
    domain?: string;
  }[],
  existingMetadata?: RedactedEntryMetadata[]
): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const mapByKey = new Map<string, DuplicateCandidate[]>();
  const reasonByKey = new Map<string, string>();

  // Helper to register key
  const register = (key: string, reason: string, candidate: DuplicateCandidate) => {
    if (!mapByKey.has(key)) {
      mapByKey.set(key, []);
      reasonByKey.set(key, reason);
    }
    const list = mapByKey.get(key)!;
    if (!list.some((c) => c.rowIndex === candidate.rowIndex && c.matchedExistingId === candidate.matchedExistingId)) {
      list.push(candidate);
    }
  };

  for (const entry of entries) {
    const normTitle = entry.title.trim().toLowerCase();
    const normUser = entry.username.trim().toLowerCase();
    const normDomain = entry.domain?.trim().toLowerCase();
    const normUrl = entry.url?.trim().toLowerCase();

    // Key 1: Domain + Username
    if (normDomain && normUser) {
      const key = `domain:${normDomain}::user:${normUser}`;
      register(key, `Matching domain '${normDomain}' and username '${entry.username}'`, {
        rowIndex: entry.rowIndex,
        title: entry.title,
        username: entry.username,
        url: entry.url,
        domain: entry.domain,
        reason: `Matching domain '${normDomain}' and username '${entry.username}'`,
      });
    } else if (normUrl && normUser) {
      const key = `url:${normUrl}::user:${normUser}`;
      register(key, `Matching URL and username '${entry.username}'`, {
        rowIndex: entry.rowIndex,
        title: entry.title,
        username: entry.username,
        url: entry.url,
        domain: entry.domain,
        reason: `Matching URL and username '${entry.username}'`,
      });
    } else if (normTitle && normUser) {
      const key = `title:${normTitle}::user:${normUser}`;
      register(key, `Matching title '${entry.title}' and username '${entry.username}'`, {
        rowIndex: entry.rowIndex,
        title: entry.title,
        username: entry.username,
        url: entry.url,
        domain: entry.domain,
        reason: `Matching title '${entry.title}' and username '${entry.username}'`,
      });
    }

    // Compare against existing unlocked vault metadata if provided
    if (existingMetadata) {
      for (const existing of existingMetadata) {
        const exDomain = existing.domain?.toLowerCase();
        const exTitle = existing.title.toLowerCase();

        if (normDomain && exDomain && normDomain === exDomain) {
          const key = `existing:domain:${normDomain}::id:${existing.id}`;
          register(key, `Matches existing vault entry '${existing.title}' (${normDomain})`, {
            rowIndex: entry.rowIndex,
            title: entry.title,
            username: entry.username,
            url: entry.url,
            domain: entry.domain,
            matchedExistingId: existing.id,
            reason: `Matches existing vault entry '${existing.title}'`,
          });
        } else if (normTitle && exTitle && normTitle === exTitle) {
          const key = `existing:title:${normTitle}::id:${existing.id}`;
          register(key, `Matches existing vault entry '${existing.title}'`, {
            rowIndex: entry.rowIndex,
            title: entry.title,
            username: entry.username,
            url: entry.url,
            domain: entry.domain,
            matchedExistingId: existing.id,
            reason: `Matches existing vault entry '${existing.title}'`,
          });
        }
      }
    }
  }

  // Filter keys with more than 1 candidate (or matched existing entry)
  let groupIndex = 1;
  for (const [key, candidates] of mapByKey.entries()) {
    const hasExistingMatch = candidates.some((c) => c.matchedExistingId !== undefined);
    if (candidates.length > 1 || (candidates.length >= 1 && hasExistingMatch)) {
      groups.push({
        id: `dup-group-${groupIndex++}`,
        key,
        reason: reasonByKey.get(key) ?? 'Duplicate detected',
        candidates,
      });
    }
  }

  return groups;
}

export interface ProposalOptions {
  customMappings?: Record<string, TargetField>;
  existingMetadata?: RedactedEntryMetadata[];
  aiMappings?: ColumnMapping[];
  aiTags?: string[];
}

export function generateImportProposal(csvContent: string, options: ProposalOptions = {}): ImportProposal {
  const { headers, rows } = parseCsv(csvContent);

  // Determine column mappings
  const heuristicMappings = suggestColumnMappings(headers);
  const mappings: ColumnMapping[] = [];

  for (const hMapping of heuristicMappings) {
    if (options.customMappings && options.customMappings[hMapping.sourceColumn]) {
      mappings.push({
        sourceColumn: hMapping.sourceColumn,
        targetField: options.customMappings[hMapping.sourceColumn],
        confidence: 'high',
        suggestedBy: 'heuristic',
      });
    } else if (options.aiMappings) {
      const aiMatch = options.aiMappings.find((m) => m.sourceColumn === hMapping.sourceColumn);
      if (aiMatch) {
        mappings.push(aiMatch);
      } else {
        mappings.push(hMapping);
      }
    } else {
      mappings.push(hMapping);
    }
  }

  // Mapping lookup
  const fieldToColumns: Partial<Record<TargetField, string>> = {};
  for (const m of mappings) {
    if (m.targetField !== 'ignore') {
      fieldToColumns[m.targetField] = m.sourceColumn;
    }
  }

  // Parse candidate items for duplicate detection
  const parsedCandidateList: {
    rowIndex: number;
    title: string;
    username: string;
    url?: string;
    domain?: string;
  }[] = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const rawTitle = fieldToColumns.title ? row[fieldToColumns.title] : '';
    const rawUrl = fieldToColumns.url ? row[fieldToColumns.url] : '';
    const rawUser = fieldToColumns.username ? row[fieldToColumns.username] : '';

    const domain = extractDomainFromUrl(rawUrl);
    const title = rawTitle && rawTitle.trim().length > 0 ? rawTitle.trim() : (domain ?? `Imported Login ${r + 1}`);

    parsedCandidateList.push({
      rowIndex: r,
      title,
      username: rawUser ?? '',
      url: rawUrl,
      domain,
    });
  }

  const duplicateGroups = findDuplicateGroups(parsedCandidateList, options.existingMetadata);
  const duplicateRowIndexSet = new Set<number>();
  const duplicateGroupLookup = new Map<number, string>();

  for (const group of duplicateGroups) {
    for (const cand of group.candidates) {
      duplicateRowIndexSet.add(cand.rowIndex);
      duplicateGroupLookup.set(cand.rowIndex, group.id);
    }
  }

  const suggestedTagsSet = new Set<string>(options.aiTags ?? []);

  // Build preview rows with zero secret exposure (secrets strictly masked)
  const previewRows: ImportPreviewRow[] = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const cand = parsedCandidateList[r];

    const rawPass = fieldToColumns.password ? row[fieldToColumns.password] : '';
    const rawNotes = fieldToColumns.notes ? row[fieldToColumns.notes] : '';
    const rawTagField = fieldToColumns.tags ? row[fieldToColumns.tags] : '';

    const rowTags: string[] = [];
    if (rawTagField && rawTagField.trim().length > 0) {
      const parts = rawTagField.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
      rowTags.push(...parts);
      for (const p of parts) suggestedTagsSet.add(p);
    }

    if (cand.domain) {
      // Inferred domain tag
      const mainTag = cand.domain.split('.')[0];
      if (mainTag && mainTag.length > 2 && !rowTags.includes(mainTag)) {
        rowTags.push(mainTag);
        suggestedTagsSet.add(mainTag);
      }
    }

    const hasPasswordSecret = Boolean(rawPass && rawPass.trim().length > 0);
    const isDuplicate = duplicateRowIndexSet.has(r);
    const duplicateGroupId = duplicateGroupLookup.get(r);

    const warnings: string[] = [];
    if (isDuplicate) {
      warnings.push('Possible duplicate entry detected');
    }
    if (!hasPasswordSecret) {
      warnings.push('No password provided in source row');
    }
    if (!cand.username) {
      warnings.push('No username or email specified');
    }

    let status: ImportPreviewRow['status'] = 'ready';
    if (!cand.title && !cand.url) {
      status = 'invalid';
    } else if (isDuplicate) {
      status = 'duplicate';
    } else if (warnings.length > 0) {
      status = 'warning';
    }

    previewRows.push({
      rowIndex: r,
      sourceData: row,
      proposedEntry: {
        type: 'login',
        title: cand.title,
        username: cand.username,
        passwordMasked: hasPasswordSecret ? '••••••••' : '',
        url: cand.url,
        domain: cand.domain,
        tags: rowTags,
        notes: rawNotes ? rawNotes.trim() : undefined,
      },
      hasPasswordSecret,
      isDuplicate,
      duplicateGroupId,
      warnings,
      status,
    });
  }

  return {
    sourceType: 'browser_csv',
    totalRows: rows.length,
    columns: headers,
    mappings,
    duplicateGroups,
    previewRows,
    suggestedTags: Array.from(suggestedTagsSet),
  };
}
