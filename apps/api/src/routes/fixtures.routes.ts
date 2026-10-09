import { Hono } from 'hono';
import type { VaultRepository } from '../repository/vault-repository.js';
import { scanFixturesForPrivacy } from '@app/shared';
import { VaultLockedError, VaultNotInitializedError } from '../repository/errors.js';

export function createFixturesRoutes(repo: VaultRepository): Hono {
  const router = new Hono();

  router.post('/seed', async (c) => {
    try {
      const count = await repo.seedSyntheticFixtures();
      return c.json({ success: true, seededCount: count });
    } catch (err: any) {
      if (err instanceof VaultLockedError) {
        return c.json({ error: err.message }, 423);
      }
      if (err instanceof VaultNotInitializedError) {
        return c.json({ error: err.message }, 400);
      }
      return c.json({ error: 'Failed to seed synthetic fixtures' }, 500);
    }
  });

  router.get('/scan', (c) => {
    const report = scanFixturesForPrivacy();
    return c.json(report);
  });

  return router;
}
