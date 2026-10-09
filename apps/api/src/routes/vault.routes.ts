import { Hono } from 'hono';
import type { VaultRepository } from '../repository/vault-repository.js';
import {
  VaultAlreadyInitializedError,
  VaultNotInitializedError,
  InvalidCredentialsError,
  ValidationError,
} from '../repository/errors.js';

export function createVaultRoutes(repo: VaultRepository): Hono {
  const router = new Hono();

  router.get('/status', (c) => {
    const status = repo.getStatus();
    return c.json(status);
  });

  router.post('/init', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const password = body.password;
      if (!password) {
        return c.json({ error: 'Password is required' }, 400);
      }

      const result = await repo.initialize(password);
      return c.json({ success: true, vaultId: result.vaultId }, 201);
    } catch (err: any) {
      if (err instanceof VaultAlreadyInitializedError) {
        return c.json({ error: err.message }, 409);
      }
      if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
      }
      return c.json({ error: 'Failed to initialize vault' }, 500);
    }
  });

  router.post('/unlock', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const password = body.password;
      if (!password) {
        return c.json({ error: 'Password is required' }, 400);
      }

      await repo.unlock(password);
      return c.json({ success: true, status: repo.getStatus() });
    } catch (err: any) {
      if (err instanceof VaultNotInitializedError) {
        return c.json({ error: err.message }, 400);
      }
      if (err instanceof InvalidCredentialsError) {
        return c.json({ error: 'Invalid master credentials' }, 401);
      }
      if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
      }
      return c.json({ error: 'Failed to unlock vault' }, 500);
    }
  });

  router.post('/lock', (c) => {
    repo.lock();
    return c.json({ success: true, status: repo.getStatus() });
  });

  return router;
}
