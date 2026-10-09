import { Hono } from 'hono';
import type { VaultRepository } from '../repository/vault-repository.js';
import {
  VaultLockedError,
  VaultNotInitializedError,
  EntryNotFoundError,
  ValidationError,
} from '../repository/errors.js';

export function createEntriesRoutes(repo: VaultRepository): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    try {
      const entries = await repo.listEntries();
      return c.json({ entries });
    } catch (err: any) {
      if (err instanceof VaultLockedError) {
        return c.json({ error: err.message }, 423); // 423 Locked
      }
      if (err instanceof VaultNotInitializedError) {
        return c.json({ error: err.message }, 400);
      }
      return c.json({ error: 'Failed to list entries' }, 500);
    }
  });

  router.post('/', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const entry = await repo.createEntry(body);
      return c.json({ entry }, 201);
    } catch (err: any) {
      if (err instanceof VaultLockedError) {
        return c.json({ error: err.message }, 423);
      }
      if (err instanceof VaultNotInitializedError) {
        return c.json({ error: err.message }, 400);
      }
      if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
      }
      return c.json({ error: 'Failed to create entry' }, 500);
    }
  });

  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const entry = await repo.getEntry(id);
      return c.json({ entry });
    } catch (err: any) {
      if (err instanceof VaultLockedError) {
        return c.json({ error: err.message }, 423);
      }
      if (err instanceof EntryNotFoundError) {
        return c.json({ error: err.message }, 404);
      }
      if (err instanceof VaultNotInitializedError) {
        return c.json({ error: err.message }, 400);
      }
      return c.json({ error: 'Failed to get entry' }, 500);
    }
  });

  router.put('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const body = await c.req.json().catch(() => ({}));
      const entry = await repo.updateEntry(id, body);
      return c.json({ entry });
    } catch (err: any) {
      if (err instanceof VaultLockedError) {
        return c.json({ error: err.message }, 423);
      }
      if (err instanceof EntryNotFoundError) {
        return c.json({ error: err.message }, 404);
      }
      if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
      }
      return c.json({ error: 'Failed to update entry' }, 500);
    }
  });

  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const deleted = await repo.deleteEntry(id);
      return c.json({ success: deleted });
    } catch (err: any) {
      if (err instanceof VaultLockedError) {
        return c.json({ error: err.message }, 423);
      }
      if (err instanceof EntryNotFoundError) {
        return c.json({ error: err.message }, 404);
      }
      return c.json({ error: 'Failed to delete entry' }, 500);
    }
  });

  return router;
}
