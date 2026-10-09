import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import type { VaultRepository } from '../repository/vault-repository.js';
import type { AiAdapter } from '../ai/adapter.js';
import {
  generateImportProposal,
  parseCsv,
  extractDomainFromUrl,
  type ImportProposal,
  type TargetField,
  type CreateEntryInput,
  type LoginEntry,
} from '@app/shared';
import {
  VaultLockedError,
  VaultNotInitializedError,
} from '../repository/errors.js';

interface StagedImport {
  proposal: ImportProposal;
  rawRows: Record<string, string>[];
  headers: string[];
  createdAt: number;
}

const stagingStore = new Map<string, StagedImport>();

function cleanupStagingStore() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, staged] of stagingStore.entries()) {
    if (staged.createdAt < cutoff) {
      stagingStore.delete(id);
    }
  }
}

export function createImportRoutes(repo: VaultRepository, aiAdapter?: AiAdapter): Hono {
  const router = new Hono();

  /**
   * POST /analyze: Parses CSV, generates review proposal with mappings,
   * duplicate groups, and masked preview rows.
   * INVARIANT: Does NOT write any records to the vault.
   */
  const handleAnalyze = async (c: any) => {
    cleanupStagingStore();

    try {
      const body = await c.req.json().catch(() => ({}));
      const csvContent = body.csvContent;

      if (!csvContent || typeof csvContent !== 'string' || csvContent.trim().length === 0) {
        return c.json({ error: 'csvContent must be a non-empty string' }, 400);
      }

      // Check vault state (must be initialized & unlocked)
      const status = repo.getStatus();
      if (!status.isInitialized) {
        throw new VaultNotInitializedError();
      }
      if (status.status !== 'unlocked') {
        throw new VaultLockedError();
      }

      const existingMetadata = await repo.getMetadataList();
      const { headers, rows } = parseCsv(csvContent);

      let aiMappings;
      let aiTags: string[] = [];

      if (aiAdapter) {
        // Safe metadata to AI only: zero secret exposure
        const aiResult = await aiAdapter.suggestImportMappings(headers, rows);
        aiMappings = aiResult.mappings;
        aiTags = aiResult.suggestedTags;
      }

      const proposal = generateImportProposal(csvContent, {
        customMappings: body.customMappings,
        existingMetadata,
        aiMappings,
        aiTags,
      });

      const stagingId = randomUUID();
      stagingStore.set(stagingId, {
        proposal,
        rawRows: rows,
        headers,
        createdAt: Date.now(),
      });

      return c.json({
        stagingId,
        proposal,
      });
    } catch (err: any) {
      if (err instanceof VaultLockedError) {
        return c.json({ error: err.message }, 423);
      }
      if (err instanceof VaultNotInitializedError) {
        return c.json({ error: err.message }, 400);
      }
      if (err?.message?.includes('AI Adapter network denial')) {
        return c.json({ error: err.message }, 403);
      }
      return c.json({ error: err?.message || 'Failed to analyze import' }, 500);
    }
  };

  router.post('/analyze', handleAnalyze);
  router.post('/preview', handleAnalyze);

  /**
   * POST /cancel: Cancels staging without persisting anything to the vault.
   */
  router.post('/cancel', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const stagingId = body.stagingId;
      if (stagingId && stagingStore.has(stagingId)) {
        stagingStore.delete(stagingId);
      }
      return c.json({ cancelled: true, message: 'Import discarded without writing to vault.' });
    } catch {
      return c.json({ cancelled: true });
    }
  });

  /**
   * POST /confirm: Explicit user confirmation required before any records are persisted.
   */
  router.post('/confirm', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const stagingId = body.stagingId;
      const confirmedRowIndices: number[] | undefined = body.confirmedRowIndices;
      const customItems = body.items;

      const entriesToCreate: CreateEntryInput<LoginEntry>[] = [];

      if (stagingId && stagingStore.has(stagingId)) {
        const staged = stagingStore.get(stagingId)!;
        const proposal = staged.proposal;
        const rows = staged.rawRows;

        const fieldToColumns: Partial<Record<TargetField, string>> = {};
        for (const m of proposal.mappings) {
          if (m.targetField !== 'ignore') {
            fieldToColumns[m.targetField] = m.sourceColumn;
          }
        }

        if (body.customMappings) {
          for (const [col, target] of Object.entries(body.customMappings as Record<string, TargetField>)) {
            if (target !== 'ignore') {
              fieldToColumns[target] = col;
            }
          }
        }

        const indicesToImport = confirmedRowIndices
          ? confirmedRowIndices
          : rows.map((_, i) => i);

        for (const idx of indicesToImport) {
          if (idx < 0 || idx >= rows.length) continue;
          const row = rows[idx];

          const rawTitle = fieldToColumns.title ? row[fieldToColumns.title] : '';
          const rawUrl = fieldToColumns.url ? row[fieldToColumns.url] : '';
          const rawUser = fieldToColumns.username ? row[fieldToColumns.username] : '';
          const rawPass = fieldToColumns.password ? row[fieldToColumns.password] : '';
          const rawNotes = fieldToColumns.notes ? row[fieldToColumns.notes] : '';
          const rawTags = fieldToColumns.tags ? row[fieldToColumns.tags] : '';

          const domain = extractDomainFromUrl(rawUrl);
          const title = rawTitle && rawTitle.trim().length > 0 ? rawTitle.trim() : (domain ?? `Imported Login ${idx + 1}`);

          const tags: string[] = [];
          if (rawTags) {
            tags.push(...rawTags.split(/[,;]/).map((t) => t.trim()).filter(Boolean));
          }
          if (domain) {
            const domainTag = domain.split('.')[0];
            if (domainTag && domainTag.length > 2 && !tags.includes(domainTag)) {
              tags.push(domainTag);
            }
          }
          if (Array.isArray(body.additionalTags)) {
            for (const t of body.additionalTags) {
              if (!tags.includes(t)) tags.push(t);
            }
          }

          entriesToCreate.push({
            type: 'login',
            title,
            username: rawUser ?? '',
            password: rawPass ?? '',
            url: rawUrl || undefined,
            domain,
            tags,
            customFields: rawNotes ? [{ label: 'notes', value: rawNotes }] : undefined,
          });
        }

        stagingStore.delete(stagingId);
      } else if (Array.isArray(customItems) && customItems.length > 0) {
        for (const item of customItems) {
          if (item.skip) continue;
          entriesToCreate.push({
            type: 'login',
            title: item.title,
            username: item.username ?? '',
            password: item.password ?? '',
            url: item.url,
            domain: item.domain ?? extractDomainFromUrl(item.url),
            tags: item.tags ?? [],
            customFields: item.notes ? [{ label: 'notes', value: item.notes }] : undefined,
          });
        }
      } else {
        return c.json({ error: 'No valid stagingId or items provided for confirmation' }, 400);
      }

      const result = await repo.importEntries(entriesToCreate);

      return c.json({
        importedCount: result.imported.length,
        failedCount: result.failed.length,
        importedEntries: result.imported.map((e) => ({ id: e.id, title: e.title, type: e.type })),
        failedRows: result.failed.map((f) => ({ rowIndex: f.index, reason: f.reason })),
      });
    } catch (err: any) {
      if (err instanceof VaultLockedError) {
        return c.json({ error: err.message }, 423);
      }
      if (err instanceof VaultNotInitializedError) {
        return c.json({ error: err.message }, 400);
      }
      return c.json({ error: err?.message || 'Failed to confirm import' }, 500);
    }
  });

  return router;
}
