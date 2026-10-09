import { Hono } from 'hono';
import type { VaultRepository } from '../repository/vault-repository.js';
import type { AiAdapter } from '../ai/adapter.js';
import { VaultLockedError, VaultNotInitializedError } from '../repository/errors.js';

export function createAskRoutes(repo: VaultRepository, aiAdapter: AiAdapter): Hono {
  const router = new Hono();

  router.post('/', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const query = typeof body.query === 'string' ? body.query.trim() : '';
      if (!query) return c.json({ error: 'Query is required' }, 400);
      if (query.length > 500) return c.json({ error: 'Query is too long' }, 400);

      const metadata = await repo.getMetadataList();
      const result = await aiAdapter.askVault(query, metadata);
      return c.json(result);
    } catch (err) {
      if (err instanceof VaultLockedError) return c.json({ error: err.message }, 423);
      if (err instanceof VaultNotInitializedError) return c.json({ error: err.message }, 400);
      return c.json({ error: 'Ask Your Vault is unavailable' }, 503);
    }
  });

  return router;
}
