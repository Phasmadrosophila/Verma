import { Hono } from 'hono';
import type { VaultRepository } from '../repository/vault-repository.js';
import {
  VaultLockedError,
  VaultNotInitializedError,
  EntryNotFoundError,
} from '../repository/errors.js';

export function createMetadataRoutes(repo: VaultRepository): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    try {
      const metadata = await repo.getMetadataList();
      return c.json({ metadata });
    } catch (err: any) {
      if (err instanceof VaultLockedError) {
        return c.json({ error: err.message }, 423);
      }
      if (err instanceof VaultNotInitializedError) {
        return c.json({ error: err.message }, 400);
      }
      return c.json({ error: 'Failed to get metadata list' }, 500);
    }
  });

  router.get('/search', async (c) => {
    const q = c.req.query('q') ?? '';
    try {
      const metadata = await repo.searchMetadata(q);
      return c.json({ metadata, query: q });
    } catch (err: any) {
      if (err instanceof VaultLockedError) {
        return c.json({ error: err.message }, 423);
      }
      if (err instanceof VaultNotInitializedError) {
        return c.json({ error: err.message }, 400);
      }
      return c.json({ error: 'Failed to search metadata' }, 500);
    }
  });

  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const metadata = await repo.getMetadataById(id);
      return c.json({ metadata });
    } catch (err: any) {
      if (err instanceof VaultLockedError) {
        return c.json({ error: err.message }, 423);
      }
      if (err instanceof EntryNotFoundError) {
        return c.json({ error: err.message }, 404);
      }
      return c.json({ error: 'Failed to get entry metadata' }, 500);
    }
  });

  return router;
}
