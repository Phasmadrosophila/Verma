import { Hono } from 'hono';
import type { VaultRepository } from '../repository/vault-repository.js';
import type { AiAdapter } from '../ai/adapter.js';
import type { RedactedEntryMetadata } from '@app/shared';
import { VaultLockedError, VaultNotInitializedError } from '../repository/errors.js';

export function createAskRoutes(repo: VaultRepository, aiAdapter: AiAdapter): Hono {
  const router = new Hono();

  router.post('/', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const query = typeof body.query === 'string' ? body.query.trim() : '';
      if (!query) return c.json({ error: 'Query is required' }, 400);
      if (query.length > 500) return c.json({ error: 'Query is too long' }, 400);

      let metadata: RedactedEntryMetadata[];
      const vaultStatus = repo.getStatus();
      // A client-supplied projection is only for the uninitialized/demo
      // preview. Once a vault exists, metadata must come from the unlocked
      // repository so locking always revokes AI access.
      if (!vaultStatus.isInitialized && Array.isArray(body.metadata) && body.metadata.length > 0) {
        // Enforce trusted redaction projection: strictly no passwords, secrets, or notes (AGENTS.md §3.1)
        metadata = body.metadata.map((item: any) => ({
          id: String(item.id),
          type: item.type === 'note' ? 'note' : item.type === 'api' || item.type === 'api_key' ? 'api_key' : 'login',
          title: String(item.title || ''),
          domain: item.domain ? String(item.domain) : undefined,
          tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
          createdAt: Number(item.createdAt || Date.now()),
          updatedAt: Number(item.updatedAt || Date.now()),
          isReused: Boolean(item.isReused),
          isWeak: Boolean(item.isWeak),
          fieldLabels: Array.isArray(item.fieldLabels) ? item.fieldLabels.map(String) : [],
        }));
      } else {
        metadata = await repo.getMetadataList();
      }

      const result = await aiAdapter.askVault(query, metadata);
      return c.json(result);
    } catch (err: any) {
      if (err instanceof VaultLockedError) return c.json({ error: err.message }, 423);
      if (err instanceof VaultNotInitializedError) return c.json({ error: err.message }, 400);
      if (err?.message?.includes('AI Adapter network denial')) return c.json({ error: err.message }, 403);
      return c.json({ error: 'Ask Your Vault is unavailable' }, 503);
    }
  });

  return router;
}
